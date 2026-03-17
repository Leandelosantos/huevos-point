const { Router } = require('express');
const auditController = require('./audit.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const tenantMiddleware = require('../../middlewares/tenantMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

const router = Router();

router.get('/', authMiddleware, tenantMiddleware, requireRole('admin'), auditController.getAll);
router.post('/action', authMiddleware, auditController.logAction);

module.exports = router;
