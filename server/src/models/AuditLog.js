const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    references: { model: 'users', key: 'id' },
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tenant_id',
    references: { model: 'tenants', key: 'id' },
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  actionType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'action_type',
  },
  entity: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'entity_id',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  previousData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'previous_data',
  },
  newData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'new_data',
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
  },
}, {
  tableName: 'audit_logs',
  updatedAt: false,
});

module.exports = AuditLog;
