const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ApiKey = sequelize.define(
  'ApiKey',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    keyPrefix: {
      type: DataTypes.STRING(12),
      allowNull: false,
      field: 'key_prefix',
    },
    keyHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'key_hash',
    },
    businessId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'business_id',
      references: { model: 'businesses', key: 'id' },
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'tenant_id',
      references: { model: 'tenants', key: 'id' },
    },
    scopes: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: ['read:all'],
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    rateLimitPerMin: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      field: 'rate_limit_per_min',
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_used_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
      references: { model: 'users', key: 'id' },
    },
  },
  {
    tableName: 'api_keys',
    timestamps: true,
    underscored: true,
  }
);

module.exports = ApiKey;
