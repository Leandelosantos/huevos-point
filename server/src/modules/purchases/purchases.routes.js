const express = require('express');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');
const purchasesController = require('./purchases.controller');

const router = express.Router();

router.use(authMiddleware);

// Only admins and superadmins can record or see purchases (since it affects cost/margin, usually restricted to admin/owner)
router.post('/', requireRole('admin'), purchasesController.createPurchase);
router.get('/', requireRole('admin'), purchasesController.getPurchases);

module.exports = router;
