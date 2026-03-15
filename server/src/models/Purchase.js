const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Purchase = sequelize.define(
  'Purchase',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tenant_id',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    marginAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'margin_amount',
    },
    provider: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'purchase_date',
    },
  },
  {
    tableName: 'purchases',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Purchase;