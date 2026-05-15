const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Expense = sequelize.define('Expense', {
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
  concept: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  expenseDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'expense_date',
  },
  receiptData: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    field: 'receipt_data',
  },
  receiptMimeType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: null,
    field: 'receipt_mime_type',
  },
}, {
  tableName: 'expenses',
  updatedAt: false,
});

module.exports = Expense;
