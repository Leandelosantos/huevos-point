const { Subscription, SubscriptionPlan, SubscriptionPayment, Tenant } = require('../../models');
const { getProvider } = require('../../services/payment/PaymentProviderFactory');
const AppError = require('../../utils/AppError');

const getStatus = async ({ tenantId }) => {
  const subscription = await Subscription.findOne({
    where: { tenantId },
    include: [{ model: SubscriptionPlan, as: 'plan' }],
  });

  if (!subscription) {
    return { subscription: null, payments: [] };
  }

  const payments = await SubscriptionPayment.findAll({
    where: { subscriptionId: subscription.id },
    order: [['created_at', 'DESC']],
    limit: 24,
    raw: true,
  });

  return { subscription, payments };
};

const cancel = async ({ tenantId }) => {
  const subscription = await Subscription.findOne({ where: { tenantId } });
  if (!subscription) {
    throw new AppError('No hay suscripción activa para este tenant', 404);
  }
  if (['cancelled', 'suspended'].includes(subscription.status)) {
    throw new AppError('La suscripción ya está cancelada o suspendida', 400);
  }

  const provider = getProvider(subscription.paymentProvider);

  if (subscription.paymentProvider === 'mobbex' && subscription.mobbexSubscriberUid) {
    await provider.cancelSubscription({ subscriberUid: subscription.mobbexSubscriberUid });
  } else if (subscription.paymentProvider === 'mercadopago' && subscription.mpPreapprovalId) {
    await provider.cancelSubscription({ preapprovalId: subscription.mpPreapprovalId });
  }

  await subscription.update({ status: 'cancelled', cancelledAt: new Date() });
  await Tenant.update({ subscriptionStatus: 'cancelled' }, { where: { id: tenantId } });

  return { message: 'Suscripción cancelada correctamente' };
};

module.exports = { getStatus, cancel };
