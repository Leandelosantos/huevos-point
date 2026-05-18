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
const SubscriptionPayment = require('./SubscriptionPayment');
const OnboardingRegistration = require('./OnboardingRegistration');
const ContactRequest = require('./ContactRequest');
const SuperadminAuditLog = require('./SuperadminAuditLog');
const ApiKey = require('./ApiKey');
const EggCategory = require('./EggCategory');
const CashWithdrawal = require('./CashWithdrawal');

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

Subscription.hasMany(SubscriptionPayment, { foreignKey: 'subscriptionId', as: 'payments' });
SubscriptionPayment.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });

Tenant.hasMany(SubscriptionPayment, { foreignKey: 'tenantId', as: 'subscriptionPayments' });
SubscriptionPayment.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

Tenant.hasMany(OnboardingRegistration, { foreignKey: 'tenantId', as: 'onboardingRegistrations' });
OnboardingRegistration.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// EggCategory associations
Tenant.hasMany(EggCategory, { foreignKey: 'tenantId', as: 'eggCategories' });
EggCategory.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

EggCategory.hasMany(Product, { foreignKey: 'categoryId', as: 'presentations' });
Product.belongsTo(EggCategory, { foreignKey: 'categoryId', as: 'category' });

EggCategory.hasMany(Purchase, { foreignKey: 'categoryId', as: 'purchases' });
Purchase.belongsTo(EggCategory, { foreignKey: 'categoryId', as: 'category' });

// SuperadminAuditLog associations
SuperadminAuditLog.belongsTo(Tenant, { foreignKey: 'targetTenant', as: 'tenant' });

// ApiKey associations
ApiKey.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });

// CashWithdrawal associations
Tenant.hasMany(CashWithdrawal, { foreignKey: 'tenantId', as: 'cashWithdrawals' });
CashWithdrawal.belongsTo(Tenant, { foreignKey: 'tenantId', as: 'tenant' });
User.hasMany(CashWithdrawal, { foreignKey: 'userId', as: 'cashWithdrawals' });
CashWithdrawal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
  SubscriptionPayment,
  OnboardingRegistration,
  ContactRequest,
  SuperadminAuditLog,
  ApiKey,
  EggCategory,
  CashWithdrawal,
};
