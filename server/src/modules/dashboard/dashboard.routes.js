const { Router } = require('express');
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = Router();

router.get('/summary', authMiddleware, dashboardController.getSummary);

module.exports = router;
