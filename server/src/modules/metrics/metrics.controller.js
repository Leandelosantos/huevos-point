const metricsService = require('./metrics.service');

class MetricsController {
  async getMetrics(req, res, next) {
    try {
      const [currentMonthTop, previousMonthTop, lowStockProducts] = await Promise.all([
        metricsService.getTopProductsCurrentMonth(),
        metricsService.getTopProductsPreviousMonth(),
        metricsService.getLowStockProducts(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          currentMonthTop,
          previousMonthTop,
          lowStockProducts,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MetricsController();
