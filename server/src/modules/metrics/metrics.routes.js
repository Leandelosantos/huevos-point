const express = require('express');
const router = express.Router();
const metricsController = require('./metrics.controller');
const authMiddleware = require('../../middlewares/authMiddleware');
const { requireRole } = require('../../middlewares/roleMiddleware');

router.use(authMiddleware);

router.get(
  '/',
  requireRole('admin'),
  metricsController.getMetrics.bind(metricsController)
);

module.exports = router;
