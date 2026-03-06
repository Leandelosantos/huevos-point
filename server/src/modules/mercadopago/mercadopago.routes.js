const express = require('express');
const router = express.Router();
const mercadopagoController = require('./mercadopago.controller');

// Ruta para recibir webhooks de Mercado Pago
router.post('/webhook', express.raw({ type: 'application/json' }), mercadopagoController.handleWebhook);

module.exports = router;
