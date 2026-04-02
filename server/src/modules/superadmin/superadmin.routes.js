const { Router } = require('express');
const superadminController = require('./superadmin.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireSuperadmin, superadminAudit } = require('../../middlewares/superadminMiddleware');

const router = Router();

router.use(authMiddleware);
router.use(requireSuperadmin);

router.get('/dashboard', superadminController.getDashboard);
router.get('/tenants', superadminController.getTenants);
router.get('/tenants/:tenantId', superadminAudit, superadminController.getTenantDetail);
router.post('/tenants/:tenantId/suspend', superadminAudit, superadminController.suspendTenant);
router.post('/tenants/:tenantId/reactivate', superadminAudit, superadminController.reactivateTenant);
router.get('/audit-log', superadminController.getAuditLog);

module.exports = router;
