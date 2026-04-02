const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' },
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    references: { model: 'tenants', key: 'id' },
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount',
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Efectivo',
    field: 'payment_method',
  },
  saleDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'sale_date',
  },
  paymentSplits: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    field: 'payment_splits',
  },
  source: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'manual',
  },
  isAutoRegistered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_auto_registered',
  },
  mpPaymentId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'mp_payment_id',
  },
}, {
  tableName: 'sales',
  updatedAt: false,
});

module.exports = Sale;
