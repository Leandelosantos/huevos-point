const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define(
  'Subscription',
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
    planId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'plan_id',
      references: { model: 'subscription_plans', key: 'id' },
    },
    billingCycle: {
      type: DataTypes.STRING(10),
      allowNull: false,
      field: 'billing_cycle',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    },
    paymentProvider: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'payment_provider',
    },
    mobbexSubscriptionUid: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'mobbex_subscription_uid',
    },
    mobbexSubscriberUid: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'mobbex_subscriber_uid',
    },
    mpPreapprovalId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'mp_preapproval_id',
    },
    mpPayerEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'mp_payer_email',
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'current_period_start',
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'current_period_end',
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'cancelled_at',
    },
    suspendedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'suspended_at',
    },
  },
  {
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true,
  }
);

module.exports = Subscription;