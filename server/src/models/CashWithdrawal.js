const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CashWithdrawal = sequelize.define('CashWithdrawal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenantId: {
    type: DataTypes.INTEGER, allowNull: false,
    field: 'tenant_id', references: { model: 'tenants', key: 'id' },
  },
  userId: {
    type: DataTypes.INTEGER, allowNull: false,
    field: 'user_id', references: { model: 'users', key: 'id' },
  },
  withdrawalDate: {
    type: DataTypes.DATEONLY, allowNull: false,
    field: 'withdrawal_date',
  },
  // 'efectivo' | 'digital' | 'rappi'
  source: { type: DataTypes.STRING(20), allowNull: false },
  // 'deuda_huevos' | 'otros'
  type: { type: DataTypes.STRING(20), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  concept: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
}, {
  tableName: 'cash_withdrawals',
  underscored: true,
});

module.exports = CashWithdrawal;
