const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { Tenant, User, Sale, SaleItem, Product, Expense } = require('../../models');
const { buildSummaryEmail, buildConsolidatedEmail } = require('./email.template');
const { sendMail } = require('../../utils/mailer');

/**
 * Gather all data needed for the daily summary of a single tenant.
 */
const getTenantSummaryData = async (tenantId, date) => {
  const salesTotal =
    (await Sale.sum('totalAmount', { where: { saleDate: date, tenantId } })) || 0;
  const expensesTotal =
    (await Expense.sum('amount', { where: { expenseDate: date, tenantId } })) || 0;
  const netBalance = parseFloat(salesTotal) - parseFloat(expensesTotal);

  const sales = await Sale.findAll({
    where: { saleDate: date, tenantId },
    include: [
      { model: User, as: 'user', attributes: ['username', 'fullName'] },
      {
        model: SaleItem,
        as: 'items',
        include: [{ model: Product, as: 'product', attributes: ['name'] }],
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  const expenses = await Expense.findAll({
    where: { expenseDate: date, tenantId },
    include: [{ model: User, as: 'user', attributes: ['username', 'fullName'] }],
    order: [['createdAt', 'ASC']],
  });

  const movements = [
    ...sales.map((sale) => {
      const discountAmount = sale.items.reduce((acc, item) => {
        const d = parseFloat(item.discount || 0);
        return d > 0
          ? acc + parseFloat(item.quantity) * parseFloat(item.unitPrice) * (d / 100)
          : acc;
      }, 0);
      return {
        id: sale.id,
        type: 'VENTA',
        createdAt: sale.createdAt,
        paymentMethod: sale.paymentMethod || 'Efectivo',
        amount: parseFloat(sale.totalAmount),
        discountAmount,
        details: sale.items.map((item) => ({
          productName: item.product?.name || 'Producto',
          quantity: item.quantity,
          discount: item.discount,
          discountConcept: item.discountConcept || null,
        })),
        description: '',
      };
    }),
    ...expenses.map((expense) => ({
      id: expense.id,
      type: 'EGRESO',
      createdAt: expense.createdAt,
      paymentMethod: 'Caja',
      amount: parseFloat(expense.amount),
      discountAmount: 0,
      details: [],
      description: expense.concept,
    })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const paymentTotals = sales.reduce((acc, sale) => {
    const method = sale.paymentMethod || 'Efectivo';
    acc[method] = (acc[method] || 0) + parseFloat(sale.totalAmount);
    return acc;
  }, {});

  const topProducts = await sequelize.query(
    `SELECT p.name, SUM(si.quantity) AS total_sold
     FROM sale_items si
     INNER JOIN sales s ON si.sale_id = s.id
     INNER JOIN products p ON si.product_id = p.id
     WHERE s.sale_date = :date AND s.tenant_id = :tenantId
     GROUP BY p.name
     ORDER BY total_sold DESC
     LIMIT 5`,
    { replacements: { date, tenantId }, type: sequelize.QueryTypes.SELECT }
  );

  return {
    date,
    totalIncome: parseFloat(salesTotal),
    totalExpenses: parseFloat(expensesTotal),
    netBalance,
    movements,
    paymentTotals,
    topProducts,
  };
};

/**
 * Admins assigned to a specific tenant that have an email.
 */
const getTenantAdminEmails = async (tenantId) => {
  const admins = await User.findAll({
    where: { role: 'admin', isActive: true, email: { [Op.not]: null, [Op.ne]: '' } },
    include: [{ association: 'tenants', where: { id: tenantId }, required: true }],
    attributes: ['email'],
  });
  return [...new Set(admins.map((u) => u.email).filter(Boolean))];
};

/**
 * All active superadmins that have an email.
 */
const getSuperadminEmails = async () => {
  const superadmins = await User.findAll({
    where: { role: 'superadmin', isActive: true, email: { [Op.not]: null, [Op.ne]: '' } },
    attributes: ['email'],
  });
  return [...new Set(superadmins.map((u) => u.email).filter(Boolean))];
};

/**
 * Main entry point: send daily summary emails.
 *
 * - Each admin receives ONE email with only their assigned branch(es).
 * - All superadmins receive ONE consolidated email with ALL branches.
 */
const sendDailySummary = async (date) => {
  const tenants = await Tenant.findAll({ where: { isActive: true } });
  const results = [];

  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── 1. Collect summary data for every tenant ──────────────────────────────
  const allTenantsData = [];

  for (const tenant of tenants) {
    try {
      const data = await getTenantSummaryData(tenant.id, date);
      allTenantsData.push({ tenantId: tenant.id, tenantName: tenant.name, data });
    } catch (err) {
      console.error(`[cron] Error gathering data for ${tenant.name}:`, err.message);
      results.push({ tenant: tenant.name, status: 'error', error: err.message });
    }
  }

  // ── 2. Send per-tenant email to assigned admins only ─────────────────────
  for (const { tenantId, tenantName, data } of allTenantsData) {
    try {
      const adminEmails = await getTenantAdminEmails(tenantId);

      if (adminEmails.length === 0) {
        results.push({ tenant: tenantName, role: 'admin', status: 'skipped', reason: 'no admins with email' });
        continue;
      }

      const html = buildSummaryEmail(tenantName, data);

      await sendMail({
        to: adminEmails,
        subject: `📊 Resumen del día — ${tenantName} — ${dateFormatted}`,
        html,
      });

      results.push({ tenant: tenantName, role: 'admin', status: 'sent', recipients: adminEmails.length });
    } catch (err) {
      console.error(`[cron] Error sending admin email for ${tenantName}:`, err.message);
      results.push({ tenant: tenantName, role: 'admin', status: 'error', error: err.message });
    }
  }

  // ── 3. Send ONE consolidated email to all superadmins ────────────────────
  try {
    const superadminEmails = await getSuperadminEmails();

    if (superadminEmails.length === 0) {
      results.push({ role: 'superadmin', status: 'skipped', reason: 'no superadmins with email' });
    } else if (allTenantsData.length === 0) {
      results.push({ role: 'superadmin', status: 'skipped', reason: 'no tenant data' });
    } else {
      const html = buildConsolidatedEmail(allTenantsData, date);

      await sendMail({
        to: superadminEmails,
        subject: `📊 Resumen general del día — Todas las sucursales — ${dateFormatted}`,
        html,
      });

      results.push({
        role: 'superadmin',
        status: 'sent',
        recipients: superadminEmails.length,
        tenants: allTenantsData.length,
      });
    }
  } catch (err) {
    console.error('[cron] Error sending consolidated superadmin email:', err.message);
    results.push({ role: 'superadmin', status: 'error', error: err.message });
  }

  return results;
};

module.exports = { sendDailySummary };
