const { Router } = require('express');
const salesController = require('./sales.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');
const { validateSale } = require('../../middlewares/validationMiddleware');

const router = Router();

router.post('/', authMiddleware, validateSale, salesController.register);
router.get('/', authMiddleware, requireRole('admin'), salesController.getAll);

module.exports = router;
