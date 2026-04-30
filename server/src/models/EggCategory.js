const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EggCategory = sequelize.define('EggCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    references: { model: 'tenants', key: 'id' },
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  stockUnits: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'stock_units',
  },
  eggsPerCrate: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 360,
    field: 'eggs_per_crate',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'egg_categories',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['tenant_id', 'name'] },
  ],
});

module.exports = EggCategory;
