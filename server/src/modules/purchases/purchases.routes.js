const express = require('express');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenantMiddleware = require('../../middlewares/tenantMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');
const { validatePurchase } = require('../../middlewares/validationMiddleware');
const purchasesController = require('./purchases.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Only admins and superadmins can record or see purchases (since it affects cost/margin, usually restricted to admin/owner)
router.post('/', requireRole('admin'), validatePurchase, purchasesController.createPurchase);
router.get('/', requireRole('admin'), purchasesController.getPurchases);
router.get('/:id/receipt', requireRole('admin'), purchasesController.getReceipt);

module.exports = router;
