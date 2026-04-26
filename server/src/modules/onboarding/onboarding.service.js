const bcrypt = require('bcryptjs');
const sequelize = require('../../config/database');
const { SubscriptionPlan, Subscription, OnboardingRegistration, ContactRequest, Tenant, User } = require('../../models');
const { getProvider } = require('../../services/payment/PaymentProviderFactory');
const { sendMail } = require('../../utils/mailer');
const AppError = require('../../utils/AppError');
const env = require('../../config/environment');

const getPlans = async () => {
  const plans = await SubscriptionPlan.findAll({
    where: { isActive: true },
    order: [['id', 'ASC']],
    raw: true,
  });

  return plans.map((p) => ({
    ...p,
    isContactPlan: p.price_monthly === '0.00' || parseFloat(p.price_monthly) === 0,
  }));
};

const register = async ({ businessName, contactName, email, phone, password, planId, billingCycle, paymentProvider }) => {
  // Validaciones de input
  if (!businessName || !contactName || !email || !password || !planId || !billingCycle || !paymentProvider) {
    throw new AppError('Todos los campos son obligatorios', 400);
  }
  if (password.length < 8) {
    throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
  }
  if (!['monthly', 'yearly'].includes(billingCycle)) {
    throw new AppError('billingCycle debe ser monthly o yearly', 400);
  }
  if (!['mobbex', 'mercadopago'].includes(paymentProvider)) {
    throw new AppError('paymentProvider debe ser mobbex o mercadopago', 400);
  }

  // Verificar email único
  const existing = await OnboardingRegistration.findOne({ where: { contactEmail: email } });
  if (existing) {
    throw new AppError('Ya existe un registro con ese email', 409);
  }

  // Cargar plan
  const plan = await SubscriptionPlan.findOne({ where: { id: planId, isActive: true } });
  if (!plan) {
    throw new AppError('Plan no encontrado', 404);
  }
  if (parseFloat(plan.priceMonthly) === 0) {
    throw new AppError('Este plan requiere contacto directo, no checkout automático', 400);
  }

  const amount = billingCycle === 'yearly' ? parseFloat(plan.priceYearly) : parseFloat(plan.priceMonthly);
  const passwordHash = await bcrypt.hash(password, 10);

  let tenant, user, subscription, registration;

  await sequelize.transaction(async (t) => {
    // Crear tenant en estado pending
    const slug = `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    tenant = await Tenant.create(
      { name: businessName, slug, subscriptionStatus: 'pending', isActive: false },
      { transaction: t }
    );

    // Crear usuario admin
    user = await User.create(
      {
        username: email,
        email,
        password: passwordHash,
        role: 'admin',
        isActive: false,
      },
      { transaction: t }
    );

    // Asociar usuario al tenant (tabla user_tenants)
    await sequelize.query(
      `INSERT INTO user_tenants (user_id, tenant_id) VALUES (:userId, :tenantId)`,
      { replacements: { userId: user.id, tenantId: tenant.id }, transaction: t }
    );

    // Crear sucursal "Principal" (product de referencia de tenant)
    // No existe modelo Branch — el tenant ES la sucursal en esta arquitectura

    // Crear suscripción pending
    subscription = await Subscription.create(
      {
        tenantId: tenant.id,
        planId: plan.id,
        billingCycle,
        status: 'pending',
        paymentProvider,
      },
      { transaction: t }
    );

    // Crear registro de onboarding
    registration = await OnboardingRegistration.create(
      {
        businessName,
        contactName,
        contactEmail: email,
        contactPhone: phone || null,
        planId: plan.id,
        billingCycle,
        paymentProvider,
        status: 'payment_pending',
        tenantId: tenant.id,
        userId: user.id,
        subscriptionId: subscription.id,
        tempPasswordHash: passwordHash,
      },
      { transaction: t }
    );
  });

  // Llamar al provider (fuera de la transacción para no bloquearla si hay timeout)
  const provider = getProvider(paymentProvider);
  const reference = `onboarding-${registration.id}`;

  let checkoutUrl, externalId;

  if (paymentProvider === 'mobbex') {
    const result = await provider.createSubscription({
      planName: plan.displayName,
      amount,
      billingCycle,
      customerEmail: email,
      customerName: contactName,
      reference,
    });
    checkoutUrl = result.checkoutUrl;
    externalId = result.subscriptionUid;

    await subscription.update({
      mobbexSubscriptionUid: result.subscriptionUid,
      mobbexSubscriberUid: result.subscriberUid,
    });
  } else {
    const result = await provider.createSubscription({
      planName: plan.displayName,
      amount,
      billingCycle,
      customerEmail: email,
      reference,
    });
    checkoutUrl = result.checkoutUrl;
    externalId = result.preapprovalId;

    await subscription.update({ mpPreapprovalId: result.preapprovalId, mpPayerEmail: email });
  }

  return { checkoutUrl };
};

const submitContact = async ({ name, email, phone, businessName, message, planId }) => {
  if (!name || !email || !message) {
    throw new AppError('name, email y message son obligatorios', 400);
  }
  // Validar email básico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Email inválido', 400);
  }

  await ContactRequest.create({ name, email, phone: phone || null, businessName: businessName || null, message, planId: planId || null });

  // Enviar email de notificación al equipo
  const contactEmail = env.CONTACT_EMAIL || 'leandrodelosantos@gmail.com';
  await sendMail({
    to: contactEmail,
    subject: `[Huevos Point] Nueva consulta de Plan Personalizado — ${name}`,
    html: `
      <h2>Nueva consulta de Plan Personalizado</h2>
      <table cellpadding="8" style="border-collapse:collapse;">
        <tr><td><strong>Nombre:</strong></td><td>${name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
        <tr><td><strong>Teléfono:</strong></td><td>${phone || '—'}</td></tr>
        <tr><td><strong>Negocio:</strong></td><td>${businessName || '—'}</td></tr>
        <tr><td><strong>Mensaje:</strong></td><td>${message}</td></tr>
      </table>
    `,
  });

  return { message: 'Tu consulta fue enviada. Te contactaremos a la brevedad.' };
};

module.exports = { getPlans, register, submitContact };
