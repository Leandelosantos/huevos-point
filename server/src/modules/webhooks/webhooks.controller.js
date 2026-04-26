const { processMobbexWebhook, processMpSubscriptionWebhook } = require('./webhooks.service');

const mobbexHandler = async (req, res) => {
  // Responder 200 inmediatamente antes de procesar
  res.sendStatus(200);

  try {
    await processMobbexWebhook(req.body);
  } catch (err) {
    console.error('[webhook:mobbex] error procesando evento:', err.message);
  }
};

const mercadoPagoSubscriptionsHandler = async (req, res) => {
  // Responder 200 inmediatamente — MP reintenta si no recibe 200 rápido
  res.sendStatus(200);

  try {
    await processMpSubscriptionWebhook(req.rawBody, req.headers);
  } catch (err) {
    if (err.statusCode === 401) {
      console.warn('[webhook:mercadopago] firma inválida — request ignorado');
    } else {
      console.error('[webhook:mercadopago] error procesando evento:', err.message);
    }
  }
};

module.exports = { mobbexHandler, mercadoPagoSubscriptionsHandler };
