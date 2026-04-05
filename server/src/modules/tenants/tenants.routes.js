const { Router } = require('express');
const tenantsController = require('./tenants.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

const router = Router();

router.use(authMiddleware);

// Cualquier admin o superadmin puede ver/editar su sucursal actual
router.get('/current', requireRole('admin', 'superadmin'), tenantsController.getCurrent);
router.put('/current', requireRole('admin', 'superadmin'), tenantsController.updateCurrent);

// Listado y creación: solo superadmin
router.get('/', requireRole('superadmin'), tenantsController.getAll);
router.post('/', requireRole('superadmin'), tenantsController.createTenant);

module.exports = router;
