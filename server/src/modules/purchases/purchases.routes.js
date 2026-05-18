const express = require('express');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenantMiddleware = require('../../middlewares/tenantMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');
const { validatePurchase } = require('../../middlewares/validationMiddleware');
const purchasesController = require('./purchases.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Cajas & deuda — BEFORE /:id routes to avoid param capture
router.get('/cash/summary', requireRole('admin'), purchasesController.getCashSummary);
router.get('/cash/registers', requireRole('admin'), purchasesController.getCashRegisters);
router.get('/cash/egg-debt', requireRole('admin'), purchasesController.getEggDebt);
router.post('/cash/withdrawals', requireRole('admin'), purchasesController.createWithdrawal);

// Purchases CRUD
router.post('/bulk', requireRole('admin'), purchasesController.createBulk);
router.post('/', requireRole('admin'), validatePurchase, purchasesController.createPurchase);
router.get('/', requireRole('admin'), purchasesController.getPurchases);
router.get('/:id/receipt', requireRole('admin'), purchasesController.getReceipt);
router.put('/:id', requireRole('superadmin'), purchasesController.updatePurchase);
router.delete('/:id', requireRole('superadmin'), purchasesController.deletePurchase);

module.exports = router;
