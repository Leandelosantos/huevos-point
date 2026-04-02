const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubscriptionPlan = sequelize.define(
  'SubscriptionPlan',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'display_name',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priceMonthly: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'price_monthly',
    },
    priceYearly: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: 'price_yearly',
    },
    maxBranches: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'max_branches',
    },
    maxUsers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      field: 'max_users',
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    tableName: 'subscription_plans',
    timestamps: true,
    underscored: true,
  }
);

module.exports = SubscriptionPlan;