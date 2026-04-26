const { Router } = require('express');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenantMiddleware = require('../../middlewares/tenantMiddleware');
const { getStatusHandler, cancelHandler } = require('./subscriptions.controller');

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/status', getStatusHandler);
router.post('/cancel', cancelHandler);

module.exports = router;
