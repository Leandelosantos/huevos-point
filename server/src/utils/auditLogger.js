const AuditLog = require('../models/AuditLog');

/**
 * Creates an audit log entry.
 * @param {object} params
 * @param {number|null} params.userId - ID of the user performing the action
 * @param {string} params.username - Username (stored separately for historical integrity)
 * @param {string} params.actionType - e.g. LOGIN, LOGOUT, VENTA, EGRESO, PRODUCTO_CREADO
 * @param {string} [params.entity] - Entity affected (e.g. 'products', 'sales')
 * @param {number} [params.entityId] - ID of the affected record
 * @param {string} [params.description] - Human-readable description
 * @param {object} [params.previousData] - Data before modification
 * @param {object} [params.newData] - Data after modification
 * @param {string} [params.ipAddress] - Client IP address
 * @param {object} [params.transaction] - Sequelize transaction
 */
const createAuditLog = async ({
  userId,
  username,
  actionType,
  entity = null,
  entityId = null,
  description = null,
  previousData = null,
  newData = null,
  ipAddress = null,
  transaction = null,
}) => {
  const options = transaction ? { transaction } : {};

  return AuditLog.create(
    {
      userId,
      username,
      actionType,
      entity,
      entityId,
      description,
      previousData,
      newData,
      ipAddress,
    },
    options
  );
};

module.exports = { createAuditLog };
