const { Router } = require('express');
const tenantsController = require('./tenants.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

const router = Router();

// Protegemos para superadmin o admin (por si el admin en el futuro necesita configurarlo)
router.use(authMiddleware);
router.use(requireRole('superadmin', 'admin'));

router.get('/', tenantsController.getAll);

module.exports = router;
