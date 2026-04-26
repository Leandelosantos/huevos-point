const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubscriptionPayment = sequelize.define(
  'SubscriptionPayment',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subscriptionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'subscription_id',
      references: { model: 'subscriptions', key: 'id' },
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'tenant_id',
      references: { model: 'tenants', key: 'id' },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'ARS',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    paymentProvider: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'payment_provider',
    },
    externalPaymentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'external_payment_id',
    },
    providerStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'provider_status',
    },
    providerDetail: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'provider_detail',
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'payment_date',
    },
  },
  {
    tableName: 'subscription_payments',
    timestamps: true,
    underscored: true,
    updatedAt: false,
  }
);

module.exports = SubscriptionPayment;
