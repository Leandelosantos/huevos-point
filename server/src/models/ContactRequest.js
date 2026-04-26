const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContactRequest = sequelize.define(
  'ContactRequest',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    businessName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'business_name',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    planId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'plan_id',
      references: { model: 'subscription_plans', key: 'id' },
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'contact_requests',
    timestamps: true,
    underscored: true,
    updatedAt: false,
  }
);

module.exports = ContactRequest;
