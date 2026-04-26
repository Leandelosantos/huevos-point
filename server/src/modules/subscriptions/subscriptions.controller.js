const { getStatus, cancel } = require('./subscriptions.service');

const getStatusHandler = async (req, res, next) => {
  try {
    const data = await getStatus({ tenantId: req.tenantId });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const cancelHandler = async (req, res, next) => {
  try {
    const result = await cancel({ tenantId: req.tenantId });
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStatusHandler, cancelHandler };
