const { Router } = require('express');
const productsController = require('./products.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');
const { validateProduct, validateProductUpdate } = require('../../middlewares/validationMiddleware');

const router = Router();

// All authenticated users can list products (needed for sale form)
router.get('/', authMiddleware, productsController.getAll);

// Admin-only operations
router.post('/bulk', authMiddleware, requireRole('admin'), productsController.uploadBulk);
router.post('/', authMiddleware, requireRole('admin'), validateProduct, productsController.create);
router.put('/:id', authMiddleware, requireRole('admin'), validateProductUpdate, productsController.update);
router.delete('/:id', authMiddleware, requireRole('admin'), productsController.remove);

module.exports = router;
