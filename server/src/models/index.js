const Tenant = require('./Tenant');
const User = require('./User');
const Product = require('./Product');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const Expense = require('./Expense');
const AuditLog = require('./AuditLog');
const Purchase = require('./Purchase');

// Tenant Associations
Tenant.belongsToMany(User, { through: 'user_tenants', foreignKey: 'tenant_id', otherKey: 'user_id', as: 'users' });
User.belongsToMany(Tenant, { through: 'user_tenants', foreignKey: 'user_id', otherKey: 'tenant_id', as: 'tenants' });

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

module.exports = {
  Tenant,
  User,
  Product,
  Sale,
  SaleItem,
  Expense,
  AuditLog,
  Purchase,
};
