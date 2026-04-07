const express = require('express');
const { apiKeyMiddleware, requireScope } = require('../../middlewares/apiKeyMiddleware');
const controller = require('./public.controller');

const router = express.Router();

// Public ping (no auth) — useful for satellite systems to check the API is reachable.
router.get('/ping', controller.ping);

// All other routes require an API key.
router.use(apiKeyMiddleware);

router.get('/tenants',   requireScope('read:tenants'),   controller.listTenants);
router.get('/products',  requireScope('read:products'),  controller.listProducts);
router.get('/sales',     requireScope('read:sales'),     controller.listSales);
router.get('/expenses',  requireScope('read:expenses'),  controller.listExpenses);
router.get('/purchases', requireScope('read:purchases'), controller.listPurchases);
router.get('/metrics',   requireScope('read:metrics'),   controller.getMetrics);

module.exports = router;
