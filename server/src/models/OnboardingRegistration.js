const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OnboardingRegistration = sequelize.define(
  'OnboardingRegistration',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    businessName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'business_name',
    },
    businessType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'business_type',
    },
    contactName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'contact_name',
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'contact_email',
    },
    contactPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'contact_phone',
    },
    planId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'plan_id',
      references: { model: 'subscription_plans', key: 'id' },
    },
    billingCycle: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'billing_cycle',
    },
    paymentProvider: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'payment_provider',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
    },
    tenantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'tenant_id',
      references: { model: 'tenants', key: 'id' },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
    },
    subscriptionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'subscription_id',
      references: { model: 'subscriptions', key: 'id' },
    },
    tempPasswordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'temp_password_hash',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
  },
  {
    tableName: 'onboarding_registrations',
    timestamps: true,
    underscored: true,
    updatedAt: false,
  }
);

module.exports = OnboardingRegistration;
