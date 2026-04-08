const { Router } = require('express');
const usersController = require('./users.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

const router = Router();

router.use(authMiddleware);

// Admin puede ver y gestionar usuarios de su propia sucursal
router.get('/', requireRole('admin', 'superadmin'), usersController.getAll);
router.get('/:id', requireRole('admin', 'superadmin'), usersController.getById);
router.post('/', requireRole('admin', 'superadmin'), usersController.create);
router.put('/:id', requireRole('admin', 'superadmin'), usersController.update);
router.delete('/:id', requireRole('admin', 'superadmin'), usersController.deactivate);
router.patch('/:id/reactivate', requireRole('admin', 'superadmin'), usersController.reactivate);

module.exports = router;
