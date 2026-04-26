const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const env = require('../../config/environment');

const getClient = () =>
  new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });

/**
 * Crea una suscripción de tipo PreApproval en MercadoPago.
 * Retorna { checkoutUrl, preapprovalId }
 */
const createSubscription = async ({ planName, amount, billingCycle, customerEmail, reference }) => {
  const client = getClient();
  const preApproval = new PreApproval(client);

  const frequency = billingCycle === 'yearly' ? 12 : 1;

  const result = await preApproval.create({
    body: {
      back_url: env.APP_LOGIN_URL,
      reason: `Huevos Point — ${planName}`,
      auto_recurring: {
        frequency,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: 'ARS',
      },
      payer_email: customerEmail,
      status: 'pending',
      external_reference: reference,
    },
  });

  const checkoutUrl = result.init_point;
  const preapprovalId = result.id;

  if (!checkoutUrl || !preapprovalId) {
    throw new Error(`MercadoPago: respuesta inesperada al crear PreApproval. ${JSON.stringify(result)}`);
  }

  return { checkoutUrl, preapprovalId };
};

/**
 * Cancela una suscripción PreApproval en MercadoPago.
 */
const cancelSubscription = async ({ preapprovalId }) => {
  const client = getClient();
  const preApproval = new PreApproval(client);
  await preApproval.update({ id: preapprovalId, body: { status: 'cancelled' } });
};

/**
 * Consulta el estado actual de un PreApproval.
 */
const getSubscriptionStatus = async ({ preapprovalId }) => {
  const client = getClient();
  const preApproval = new PreApproval(client);
  return preApproval.get({ id: preapprovalId });
};

module.exports = { createSubscription, cancelSubscription, getSubscriptionStatus };
