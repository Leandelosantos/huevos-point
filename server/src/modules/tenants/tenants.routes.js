const { Router } = require('express');
const tenantsController = require('./tenants.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

const router = Router();

router.use(authMiddleware);

// Cualquier admin o superadmin puede ver/editar su sucursal actual
router.get('/current', requireRole('admin', 'superadmin'), tenantsController.getCurrent);
router.put('/current', requireRole('admin', 'superadmin'), tenantsController.updateCurrent);

// Listado: solo superadmin
router.get('/', requireRole('superadmin'), tenantsController.getAll);
// Creación y eliminación: admin y superadmin
router.post('/', requireRole('admin', 'superadmin'), tenantsController.createTenant);
router.delete('/:id', requireRole('admin', 'superadmin'), tenantsController.deleteTenant);

module.exports = router;
