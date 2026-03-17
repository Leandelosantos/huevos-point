const metricsService = require('./metrics.service');

class MetricsController {
  async getMetrics(req, res, next) {
    try {
      const [currentMonthTop, previousMonthTop, lowStockProducts] = await Promise.all([
        metricsService.getTopProductsCurrentMonth(req.tenantId),
        metricsService.getTopProductsPreviousMonth(req.tenantId),
        metricsService.getLowStockProducts(req.tenantId),
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

  async getMonthlyBalance(req, res, next) {
    try {
      const now = new Date();
      const year = parseInt(req.query.year, 10) || now.getFullYear();
      const month = parseInt(req.query.month, 10) || now.getMonth() + 1;

      if (month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: 'Mes inválido (1-12)' });
      }

      const data = await metricsService.getMonthlyBalance(req.tenantId, year, month);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MetricsController();
