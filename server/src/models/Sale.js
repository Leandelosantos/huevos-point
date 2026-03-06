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
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'CANCELLED'),
    allowNull: false,
    defaultValue: 'COMPLETED',
  },
  mpPreferenceId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'mp_preference_id',
  },
  saleDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'sale_date',
  },
}, {
  tableName: 'sales',
  updatedAt: false,
});

module.exports = Sale;
