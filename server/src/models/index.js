const Tenant = require('./Tenant');
const User = require('./User');
const Product = require('./Product');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const Expense = require('./Expense');
const AuditLog = require('./AuditLog');
const Purchase = require('./Purchase');
const SubscriptionPlan = require('./SubscriptionPlan');
const Subscription = require('./Subscription');
const SuperadminAuditLog = require('./SuperadminAuditLog');

// Tenant Associations
Tenant.belongsToMany(User, { through: { model: 'user_tenants', timestamps: false }, foreignKey: 'tenant_id', otherKey: 'user_id', as: 'users' });
User.belongsToMany(Tenant, { through: { model: 'user_tenants', timestamps: false }, foreignKey: 'user_id', otherKey: 'tenant_id', as: 'tenants' });

Tenant.hasMany(Product, { foreignKey: 'tenantId', as: 'products' });
Product.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Sale, { foreignKey: 'tenantId', as: 'sales' });
Sale.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Expense, { foreignKey: 'tenantId', as: 'expenses' });
Expense.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(Purchase, { foreignKey: 'tenantId', as: 'purchases' });
Purchase.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// Associations
User.hasMany(Sale, { foreignKey: 'userId', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Expense, { foreignKey: 'userId', as: 'expenses' });
Expense.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Product.hasMany(Purchase, { foreignKey: 'productId', as: 'purchases' });
Purchase.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Purchase, { foreignKey: 'userId', as: 'purchases' });
Purchase.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Sale.hasMany(SaleItem, { foreignKey: 'saleId', as: 'items', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });

Product.hasMany(SaleItem, { foreignKey: 'productId', as: 'saleItems' });
SaleItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Subscription associations
Tenant.hasOne(Subscription, { foreignKey: 'tenantId', as: 'subscription' });
Subscription.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

SubscriptionPlan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });
Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'planId', as: 'plan' });

// SuperadminAuditLog associations
SuperadminAuditLog.belongsTo(Tenant, { foreignKey: 'targetTenant', as: 'tenant' });

module.exports = {
  Tenant,
  User,
  Product,
  Sale,
  SaleItem,
  Expense,
  AuditLog,
  Purchase,
  SubscriptionPlan,
  Subscription,
  SuperadminAuditLog,
};
