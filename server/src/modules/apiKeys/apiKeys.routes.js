const express = require('express');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');
const controller = require('./apiKeys.controller');

const router = express.Router();

// All admin routes require JWT auth + superadmin role
router.use(authMiddleware);
router.use(requireRole('superadmin'));

router.get('/', controller.list);
router.post('/', controller.create);
router.delete('/:id', controller.revoke);

module.exports = router;
