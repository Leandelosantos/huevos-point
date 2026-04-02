const { Op } = require('sequelize');
const { Tenant, User, Product, Sale, Expense, SuperadminAuditLog } = require('../../models');

const getDashboard = async () => {
  const [active, suspended, total] = await Promise.all([
    Tenant.count({ where: { isActive: true } }),
    Tenant.count({ where: { isActive: false } }),
    Tenant.count(),
  ]);

  const recentTenants = await Tenant.findAll({
    order: [['createdAt', 'DESC']],
    limit: 5,
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateThreshold = thirtyDaysAgo.toISOString().split('T')[0];

  const [totalRevenueLast30Days, totalSalesLast30Days] = await Promise.all([
    Sale.sum('totalAmount', { where: { saleDate: { [Op.gte]: dateThreshold } } }),
    Sale.count({ where: { saleDate: { [Op.gte]: dateThreshold } } }),
  ]);

  return {
    tenantStats: { active, suspended, total },
    recentTenants,
    totalRevenueLast30Days: parseFloat(totalRevenueLast30Days) || 0,
    totalSalesLast30Days: totalSalesLast30Days || 0,
  };
};

const getTenants = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateThreshold = thirtyDaysAgo.toISOString().split('T')[0];

  const tenants = await Tenant.findAll({ order: [['createdAt', 'DESC']] });

  const results = await Promise.all(
    tenants.map(async (tenant) => {
      const [userCount, productCount, salesLast30Days] = await Promise.all([
        User.count({
          include: [{ model: Tenant, as: 'tenants', where: { id: tenant.id }, through: { attributes: [] } }],
        }),
        Product.count({ where: { tenantId: tenant.id } }),
        Sale.sum('totalAmount', {
          where: { tenantId: tenant.id, saleDate: { [Op.gte]: dateThreshold } },
        }),
      ]);

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        subscriptionStatus: tenant.subscriptionStatus,
        userCount,
        productCount,
        salesLast30Days: parseFloat(salesLast30Days) || 0,
        createdAt: tenant.createdAt,
      };
    })
  );

  return results;
};

const getTenantDetail = async (tenantId) => {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    const AppError = require('../../utils/AppError');
    throw new AppError('Tenant no encontrado', 404);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateThreshold = thirtyDaysAgo.toISOString().split('T')[0];

  const [users, totalSales30d, totalExpenses30d, productCount, activeProductCount, recentSales] =
    await Promise.all([
      User.findAll({
        include: [
          {
            model: Tenant,
            as: 'tenants',
            where: { id: tenantId },
            through: { attributes: [] },
            attributes: [],
          },
        ],
        attributes: ['id', 'username', 'fullName', 'email', 'role', 'isActive', 'createdAt'],
      }),
      Sale.sum('totalAmount', {
        where: { tenantId, saleDate: { [Op.gte]: dateThreshold } },
      }),
      Expense.sum('amount', {
        where: { tenantId, expenseDate: { [Op.gte]: dateThreshold } },
      }),
      Product.count({ where: { tenantId } }),
      Product.count({ where: { tenantId, isActive: true } }),
      Sale.findAll({
        where: { tenantId, saleDate: { [Op.gte]: dateThreshold } },
        attributes: ['id', 'totalAmount', 'paymentMethod', 'saleDate', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 20,
      }),
    ]);

  const salesTotal = parseFloat(totalSales30d) || 0;
  const expensesTotal = parseFloat(totalExpenses30d) || 0;

  return {
    tenant,
    users,
    recentSales,
    totalSales30d: salesTotal,
    totalExpenses30d: expensesTotal,
    netBalance30d: salesTotal - expensesTotal,
    productCount,
    activeProductCount,
  };
};

const suspendTenant = async (tenantId) => {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    const AppError = require('../../utils/AppError');
    throw new AppError('Tenant no encontrado', 404);
  }
  await tenant.update({ isActive: false, subscriptionStatus: 'suspended' });
  return tenant;
};

const reactivateTenant = async (tenantId) => {
  const tenant = await Tenant.findByPk(tenantId);
  if (!tenant) {
    const AppError = require('../../utils/AppError');
    throw new AppError('Tenant no encontrado', 404);
  }
  await tenant.update({ isActive: true, subscriptionStatus: 'active' });
  return tenant;
};

const getAuditLog = async ({ limit = 50, offset = 0 }) => {
  const { count, rows } = await SuperadminAuditLog.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset),
    include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name'] }],
  });

  return { total: count, rows };
};

module.exports = {
  getDashboard,
  getTenants,
  getTenantDetail,
  suspendTenant,
  reactivateTenant,
  getAuditLog,
};
