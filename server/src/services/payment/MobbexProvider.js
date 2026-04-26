const axios = require('axios');
const env = require('../../config/environment');

const BASE_URL = 'https://api.mobbex.com/p';

const headers = () => ({
  'x-api-key': env.MOBBEX_API_KEY,
  'x-access-token': env.MOBBEX_ACCESS_TOKEN,
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

/**
 * Crea una suscripción en Mobbex y un suscriptor asociado.
 * Retorna { checkoutUrl, subscriptionUid, subscriberUid }
 */
const createSubscription = async ({ planName, amount, billingCycle, customerEmail, customerName, customerIdentification, reference }) => {
  const interval = billingCycle === 'yearly' ? '1y' : '1m';

  // 1. Crear suscripción (template)
  const subRes = await axios.post(
    `${BASE_URL}/subscriptions`,
    {
      total: amount,
      currency: 'ars',
      type: 'dynamic',
      name: planName,
      description: `Huevos Point — ${planName}`,
      interval,
      trial: 0,
      limit: 0,
      return_url: env.APP_LOGIN_URL,
      reference,
    },
    { headers: headers() }
  );

  const subscriptionUid = subRes.data?.data?.uid;
  if (!subscriptionUid) {
    throw new Error(`Mobbex: no se obtuvo UID de suscripción. ${JSON.stringify(subRes.data)}`);
  }

  // 2. Crear suscriptor (checkout de tarjeta)
  const startDate = new Date().toISOString().split('T')[0];
  const subcriberRes = await axios.post(
    `${BASE_URL}/subscriptions/${subscriptionUid}/subscriber`,
    {
      customer: {
        email: customerEmail,
        name: customerName,
        identification: customerIdentification || '',
      },
      reference,
      startDate,
    },
    { headers: headers() }
  );

  const subscriberUid = subcriberRes.data?.data?.uid;
  const checkoutUrl = subcriberRes.data?.data?.sourceUrl;

  if (!subscriberUid || !checkoutUrl) {
    throw new Error(`Mobbex: no se obtuvo UID/sourceUrl del suscriptor. ${JSON.stringify(subcriberRes.data)}`);
  }

  return { checkoutUrl, subscriptionUid, subscriberUid };
};

/**
 * Suspende un suscriptor en Mobbex.
 */
const cancelSubscription = async ({ subscriberUid }) => {
  await axios.post(
    `${BASE_URL}/subscriptions/subscribers/${subscriberUid}/action/suspend`,
    {},
    { headers: headers() }
  );
};

module.exports = { createSubscription, cancelSubscription };
