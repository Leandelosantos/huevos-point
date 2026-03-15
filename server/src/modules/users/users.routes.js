const { Router } = require('express');
const usersController = require('./users.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

const router = Router();

// Todas las rutas de usuarios están estrictamente limitadas al Super Administrador
router.use(authMiddleware);
router.use(requireRole('superadmin'));

router.get('/', usersController.getAll);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.delete('/:id', usersController.deactivate);

module.exports = router;
