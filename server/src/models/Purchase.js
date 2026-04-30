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
      references: { model: 'tenants', key: 'id' },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'product_id',
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'category_id',
      references: { model: 'egg_categories', key: 'id' },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    marginAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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
  },
  {
    tableName: 'purchases',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Purchase;