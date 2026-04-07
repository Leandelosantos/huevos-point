const { Op, fn, col } = require('sequelize');
const { Tenant, Product, Sale, SaleItem, Expense, Purchase } = require('../../models');

/**
 * Resolves the list of tenant IDs visible for a given API key context.
 * - tenant scope:   the single tenant assigned to the key
 * - business scope: every active tenant of the business
 * Returns [] if neither is set (effectively blocks all queries).
 */
const resolveTenantIds = async ({ businessId, tenantId }) => {
  if (tenantId) return [parseInt(tenantId, 10)];
  if (businessId) {
    const tenants = await Tenant.findAll({
      where: { businessId: parseInt(businessId, 10), isActive: true },
      attributes: ['id'],
      raw: true,
    });
    return tenants.map((t) => t.id);
  }
  return [];
};

/**
 * Builds a Sequelize WHERE clause that scopes a query to a list of tenant ids.
 * If the list is empty, returns a clause that matches nothing.
 */
const tenantScopeClause = (tenantIds) => {
  if (!tenantIds || tenantIds.length === 0) return { tenantId: -1 };
  if (tenantIds.length === 1) return { tenantId: tenantIds[0] };
  return { tenantId: { [Op.in]: tenantIds } };
};

const findTenants = async ({ businessId, tenantId, limit, offset }) => {
  const where = { isActive: true };
  if (tenantId) where.id = parseInt(tenantId, 10);
  else if (businessId) where.businessId = parseInt(businessId, 10);
  return Tenant.findAndCountAll({
    where,
    attributes: ['id', 'name', 'slug', 'businessId', 'subscriptionStatus', 'createdAt'],
    order: [['id', 'ASC']],
    limit,
    offset,
  });
};

const findProducts = async ({ businessId, tenantId, limit, offset, activeOnly }) => {
  const tenantIds = await resolveTenantIds({ businessId, tenantId });
  const where = tenantScopeClause(tenantIds);
  if (activeOnly) where.isActive = true;
  return Product.findAndCountAll({
    where,
    attributes: ['id', 'tenantId', 'name', 'stockQuantity', 'unitPrice', 'isActive', 'createdAt', 'updatedAt'],
    order: [['id', 'ASC']],
    limit,
    offset,
  });
};

const findSales = async ({ businessId, tenantId, from, to, limit, offset }) => {
  const tenantIds = await resolveTenantIds({ businessId, tenantId });
  const where = tenantScopeClause(tenantIds);
  if (from || to) {
    where.saleDate = {};
    if (from) where.saleDate[Op.gte] = from;
    if (to) where.saleDate[Op.lte] = to;
  }
  return Sale.findAndCountAll({
    where,
    attributes: ['id', 'tenantId', 'userId', 'totalAmount', 'paymentMethod', 'paymentSplits', 'saleDate', 'source', 'createdAt'],
    include: [
      {
        model: SaleItem,
        as: 'items',
        attributes: ['id', 'productId', 'quantity', 'unitPrice', 'subtotal', 'discount', 'discountConcept'],
      },
    ],
    order: [['saleDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
    distinct: true,
  });
};

const findExpenses = async ({ businessId, tenantId, from, to, limit, offset }) => {
  const tenantIds = await resolveTenantIds({ businessId, tenantId });
  const where = tenantScopeClause(tenantIds);
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate[Op.gte] = from;
    if (to) where.expenseDate[Op.lte] = to;
  }
  return Expense.findAndCountAll({
    where,
    attributes: ['id', 'tenantId', 'userId', 'concept', 'amount', 'expenseDate', 'createdAt'],
    order: [['expenseDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
};

const findPurchases = async ({ businessId, tenantId, from, to, limit, offset }) => {
  const tenantIds = await resolveTenantIds({ businessId, tenantId });
  const where = tenantScopeClause(tenantIds);
  if (from || to) {
    where.purchaseDate = {};
    if (from) where.purchaseDate[Op.gte] = from;
    if (to) where.purchaseDate[Op.lte] = to;
  }
  return Purchase.findAndCountAll({
    where,
    // Explicitly EXCLUDE receipt_data to avoid sending base64 blobs in lists
    attributes: ['id', 'tenantId', 'productId', 'userId', 'quantity', 'cost', 'price', 'marginAmount', 'provider', 'purchaseDate', 'createdAt'],
    order: [['purchaseDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
};

/**
 * Aggregated metrics for a date range, scoped by api key.
 * Returns: { totalSales, totalSalesCount, totalExpenses, totalExpensesCount, netBalance }
 */
const getAggregatedMetrics = async ({ businessId, tenantId, from, to }) => {
  const tenantIds = await resolveTenantIds({ businessId, tenantId });
  const baseWhere = tenantScopeClause(tenantIds);

  const salesWhere = { ...baseWhere };
  const expensesWhere = { ...baseWhere };
  if (from || to) {
    salesWhere.saleDate = {};
    expensesWhere.expenseDate = {};
    if (from) {
      salesWhere.saleDate[Op.gte] = from;
      expensesWhere.expenseDate[Op.gte] = from;
    }
    if (to) {
      salesWhere.saleDate[Op.lte] = to;
      expensesWhere.expenseDate[Op.lte] = to;
    }
  }

  const [salesRow, expensesRow] = await Promise.all([
    Sale.findOne({
      where: salesWhere,
      attributes: [
        [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ],
      raw: true,
    }),
    Expense.findOne({
      where: expensesWhere,
      attributes: [
        [fn('COALESCE', fn('SUM', col('amount')), 0), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ],
      raw: true,
    }),
  ]);

  const totalSales = parseFloat(salesRow.total) || 0;
  const totalExpenses = parseFloat(expensesRow.total) || 0;
  return {
    totalSales,
    totalSalesCount: parseInt(salesRow.count, 10) || 0,
    totalExpenses,
    totalExpensesCount: parseInt(expensesRow.count, 10) || 0,
    netBalance: totalSales - totalExpenses,
  };
};

module.exports = {
  findTenants,
  findProducts,
  findSales,
  findExpenses,
  findPurchases,
  getAggregatedMetrics,
};
