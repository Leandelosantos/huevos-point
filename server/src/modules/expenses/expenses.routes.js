const { Router } = require('express');
const expensesController = require('./expenses.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');
const { validateExpense } = require('../../middlewares/validationMiddleware');

const router = Router();

router.post('/', authMiddleware, validateExpense, expensesController.register);
router.get('/', authMiddleware, requireRole('admin'), expensesController.getAll);

module.exports = router;
