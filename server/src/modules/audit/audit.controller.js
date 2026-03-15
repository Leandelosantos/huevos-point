const auditService = require('./audit.service');

const getAll = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.tenantId, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const { createAuditLog } = require('../../utils/auditLogger');

const logAction = async (req, res, next) => {
  try {
    const { actionType, description, entity, entityId, newData } = req.body;
    
    await createAuditLog({
      tenantId: req.tenantId || null,
      userId: req.user.id,
      username: req.user.username,
      actionType: actionType || 'SISTEMA',
      description,
      entity,
      entityId,
      newData,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Acción registrada correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, logAction };
