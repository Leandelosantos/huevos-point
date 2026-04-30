const { Router } = require('express');
const eggCategoriesController = require('./eggCategories.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

const router = Router();

// All authenticated users can list categories (needed for sale/purchase forms)
router.get('/', authMiddleware, eggCategoriesController.getAll);

// Admin-only operations
router.post('/', authMiddleware, requireRole('admin'), eggCategoriesController.create);
router.patch('/:id/stock', authMiddleware, requireRole('admin'), eggCategoriesController.updateStock);
router.delete('/:id', authMiddleware, requireRole('admin'), eggCategoriesController.remove);

module.exports = router;
