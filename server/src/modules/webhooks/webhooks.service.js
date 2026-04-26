const crypto = require('crypto');
const { Subscription, SubscriptionPayment, OnboardingRegistration, Tenant } = require('../../models');
const env = require('../../config/environment');

/**
 * Activa tenant + usuario + suscripción tras pago confirmado.
 * Idempotente: si ya está active, no hace nada.
 */
const activateSubscription = async ({ subscription, amount, currency, externalPaymentId, providerStatus, providerDetail }) => {
  if (subscription.status === 'active') return;

  const now = new Date();
  const periodEnd = new Date(now);
  if (subscription.billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  await subscription.update({
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
  });

  await Tenant.update(
    { subscriptionStatus: 'active', isActive: true },
    { where: { id: subscription.tenantId } }
  );

  // Activar usuario admin de este tenant
  const sequelize = require('../../config/database');
  await sequelize.query(
    `UPDATE users SET is_active = true
     WHERE id IN (
       SELECT user_id FROM user_tenants WHERE tenant_id = :tenantId
     ) AND role = 'admin'`,
    { replacements: { tenantId: subscription.tenantId } }
  );

  // Registrar pago si hay externalPaymentId y no existe ya
  if (externalPaymentId) {
    const alreadyExists = await SubscriptionPayment.findOne({ where: { externalPaymentId } });
    if (!alreadyExists) {
      await SubscriptionPayment.create({
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
        amount: amount || 0,
        currency: currency || 'ARS',
        status: 'approved',
        paymentProvider: subscription.paymentProvider,
        externalPaymentId,
        providerStatus: providerStatus || null,
        providerDetail: providerDetail || null,
        paymentDate: new Date(),
      });
    }
  }

  // Marcar onboarding como completado
  await OnboardingRegistration.update(
    { status: 'completed', completedAt: new Date() },
    { where: { subscriptionId: subscription.id } }
  );
};

/**
 * Registra un pago recurrente exitoso y renueva el período.
 * Idempotente por externalPaymentId.
 */
const registerRecurringPayment = async ({ subscription, amount, currency, externalPaymentId, providerStatus, providerDetail }) => {
  if (externalPaymentId) {
    const alreadyExists = await SubscriptionPayment.findOne({ where: { externalPaymentId } });
    if (alreadyExists) return;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (subscription.billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  await subscription.update({
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
  });

  await Tenant.update({ subscriptionStatus: 'active' }, { where: { id: subscription.tenantId } });

  await SubscriptionPayment.create({
    subscriptionId: subscription.id,
    tenantId: subscription.tenantId,
    amount: amount || 0,
    currency: currency || 'ARS',
    status: 'approved',
    paymentProvider: subscription.paymentProvider,
    externalPaymentId: externalPaymentId || null,
    providerStatus: providerStatus || null,
    providerDetail: providerDetail || null,
    paymentDate: now,
  });
};

/**
 * Registra pago fallido y marca past_due.
 */
const registerFailedPayment = async ({ subscription, amount, currency, externalPaymentId, providerStatus, providerDetail }) => {
  if (externalPaymentId) {
    const alreadyExists = await SubscriptionPayment.findOne({ where: { externalPaymentId } });
    if (alreadyExists) return;
  }

  await subscription.update({ status: 'past_due' });
  await Tenant.update({ subscriptionStatus: 'past_due' }, { where: { id: subscription.tenantId } });

  await SubscriptionPayment.create({
    subscriptionId: subscription.id,
    tenantId: subscription.tenantId,
    amount: amount || 0,
    currency: currency || 'ARS',
    status: 'rejected',
    paymentProvider: subscription.paymentProvider,
    externalPaymentId: externalPaymentId || null,
    providerStatus: providerStatus || null,
    providerDetail: providerDetail || null,
    paymentDate: new Date(),
  });
};

// ─── Mobbex ─────────────────────────────────────────────────────────────────

const processMobbexWebhook = async (body) => {
  const eventType = body.type;
  const statusCode = body?.data?.payment?.status?.code;
  const subscriptionUid = body?.data?.subscription?.uid;
  const subscriberUid = body?.data?.subscriber?.uid;
  const externalPaymentId = body?.data?.payment?.id ? String(body.data.payment.id) : null;
  const amount = body?.data?.payment?.total ? parseFloat(body.data.payment.total) : 0;

  if (!subscriptionUid && !subscriberUid) return;

  const subscription = await Subscription.findOne({
    where: subscriptionUid
      ? { mobbexSubscriptionUid: subscriptionUid }
      : { mobbexSubscriberUid: subscriberUid },
  });
  if (!subscription) return;

  if (eventType === 'subscription:registration' && statusCode === '200') {
    await activateSubscription({ subscription, amount, externalPaymentId, providerStatus: statusCode });
  } else if (eventType === 'subscription:execution') {
    if (statusCode === '200') {
      await registerRecurringPayment({ subscription, amount, externalPaymentId, providerStatus: statusCode });
    } else {
      await registerFailedPayment({ subscription, amount, externalPaymentId, providerStatus: statusCode });
    }
  } else if (eventType === 'subscription:cancel') {
    await subscription.update({ status: 'cancelled', cancelledAt: new Date() });
    await Tenant.update({ subscriptionStatus: 'cancelled' }, { where: { id: subscription.tenantId } });
  } else if (eventType === 'subscription:suspend') {
    await subscription.update({ status: 'suspended', suspendedAt: new Date() });
    await Tenant.update({ subscriptionStatus: 'suspended' }, { where: { id: subscription.tenantId } });
  }
};

// ─── MercadoPago ─────────────────────────────────────────────────────────────

/**
 * Verifica la firma HMAC SHA256 del webhook de MercadoPago.
 * Header x-signature: "ts=<timestamp>,v1=<hash>"
 */
const verifyMpSignature = (rawBody, headers) => {
  const signature = headers['x-signature'];
  const requestId = headers['x-request-id'];
  if (!signature) return false;

  const parts = {};
  signature.split(',').forEach((part) => {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  });

  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  // Extraer data.id del body
  let dataId;
  try {
    const parsed = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    dataId = parsed?.data?.id;
  } catch {
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac('sha256', env.MP_WEBHOOK_SECRET || '')
    .update(manifest)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
};

const processMpSubscriptionWebhook = async (rawBody, headers) => {
  if (!verifyMpSignature(rawBody, headers)) {
    throw Object.assign(new Error('Firma inválida'), { statusCode: 401 });
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

  if (body.type !== 'subscription_preapproval') return;

  const preapprovalId = body?.data?.id;
  if (!preapprovalId) return;

  const subscription = await Subscription.findOne({ where: { mpPreapprovalId: preapprovalId } });
  if (!subscription) return;

  // Re-consultar estado actual en MP
  const { getSubscriptionStatus } = require('../../services/payment/MercadoPagoProvider');
  const preapproval = await getSubscriptionStatus({ preapprovalId });
  const mpStatus = preapproval.status;

  if (mpStatus === 'authorized') {
    // Puede ser activación inicial o pago recurrente
    const lastPaymentId = preapproval.summarized?.last_charged_date
      ? `mp-${preapprovalId}-${preapproval.summarized.last_charged_date}`
      : null;
    const amount = preapproval.auto_recurring?.transaction_amount || 0;

    if (subscription.status !== 'active') {
      await activateSubscription({
        subscription,
        amount,
        externalPaymentId: lastPaymentId,
        providerStatus: mpStatus,
      });
    } else {
      await registerRecurringPayment({
        subscription,
        amount,
        externalPaymentId: lastPaymentId,
        providerStatus: mpStatus,
      });
    }
  } else if (mpStatus === 'cancelled') {
    await subscription.update({ status: 'cancelled', cancelledAt: new Date() });
    await Tenant.update({ subscriptionStatus: 'cancelled' }, { where: { id: subscription.tenantId } });
  } else if (mpStatus === 'paused') {
    await subscription.update({ status: 'suspended', suspendedAt: new Date() });
    await Tenant.update({ subscriptionStatus: 'suspended' }, { where: { id: subscription.tenantId } });
  }
};

module.exports = { processMobbexWebhook, processMpSubscriptionWebhook };
