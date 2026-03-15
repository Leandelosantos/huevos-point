const { Router } = require('express');
const auditController = require('./audit.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

const router = Router();

router.get('/', authMiddleware, requireRole('admin'), auditController.getAll);
router.post('/action', authMiddleware, auditController.logAction);

module.exports = router;
