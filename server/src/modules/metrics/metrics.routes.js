const express = require('express');
const router = express.Router();
const metricsController = require('./metrics.controller');
const { protect, restrictTo } = require('../../middlewares/authMiddleware');

router.use(protect);

router.get(
  '/',
  restrictTo('admin'),
  metricsController.getMetrics.bind(metricsController)
);

module.exports = router;
