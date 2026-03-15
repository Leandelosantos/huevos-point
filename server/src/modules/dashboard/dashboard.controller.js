const dashboardService = require('./dashboard.service');

const getSummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    const summary = await dashboardService.getDailySummary(date, req.tenantId);
    const movements = await dashboardService.getDailyMovements(date, req.tenantId);

    res.json({
      success: true,
      data: { summary, movements },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary };
