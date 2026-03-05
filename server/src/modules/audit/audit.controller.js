const auditService = require('./audit.service');

const getAll = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll };
