const { Router } = require('express');
const { mobbexHandler, mercadoPagoSubscriptionsHandler } = require('./webhooks.controller');

const router = Router();

// Mobbex: x-www-form-urlencoded — el body ya viene parseado por express.urlencoded en app.js
router.post('/mobbex', mobbexHandler);

// MercadoPago: requiere rawBody para verificar firma HMAC SHA256
// El rawBody se captura con el middleware en app.js antes de express.json
router.post('/mercadopago-subscriptions', mercadoPagoSubscriptionsHandler);

module.exports = router;
