const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const { Tenant, User, Sale, SaleItem, Product, Expense } = require('../../models');
const { buildSummaryEmail } = require('./email.template');
const { sendMail } = require('../../utils/mailer');

/**
 * Gather all data needed for the daily summary email of a single tenant.
 */
const getTenantSummaryData = async (tenantId, date) => {
  // --- Summary totals ---
  const salesTotal =
    (await Sale.sum('totalAmount', { where: { saleDate: date, tenantId } })) || 0;
  const expensesTotal =
    (await Expense.sum('amount', { where: { expenseDate: date, tenantId } })) || 0;
  const netBalance = parseFloat(salesTotal) - parseFloat(expensesTotal);

  // --- Daily movements ---
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

  // --- Payment method breakdown ---
  const paymentTotals = sales.reduce((acc, sale) => {
    const method = sale.paymentMethod || 'Efectivo';
    acc[method] = (acc[method] || 0) + parseFloat(sale.totalAmount);
    return acc;
  }, {});

  // --- Top 5 products ---
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
 * Get recipient emails for a tenant:
 * - Admin users that belong to that tenant and have an email
 * - All superadmins that have an email
 */
const getRecipients = async (tenantId) => {
  const admins = await User.findAll({
    where: { role: 'admin', isActive: true, email: { [Op.not]: null, [Op.ne]: '' } },
    include: [{ association: 'tenants', where: { id: tenantId }, required: true }],
    attributes: ['email'],
  });

  const superadmins = await User.findAll({
    where: { role: 'superadmin', isActive: true, email: { [Op.not]: null, [Op.ne]: '' } },
    attributes: ['email'],
  });

  const all = [...admins, ...superadmins];
  const unique = [...new Set(all.map((u) => u.email).filter(Boolean))];
  return unique;
};

/**
 * Main entry point: send daily summary for all active tenants.
 */
const sendDailySummary = async (date) => {
  const tenants = await Tenant.findAll({ where: { isActive: true } });

  const results = [];

  for (const tenant of tenants) {
    try {
      const recipients = await getRecipients(tenant.id);
      if (recipients.length === 0) {
        results.push({ tenant: tenant.name, status: 'skipped', reason: 'no recipients' });
        continue;
      }

      const data = await getTenantSummaryData(tenant.id, date);
      const html = buildSummaryEmail(tenant.name, data);

      const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await sendMail({
        to: recipients,
        subject: `📊 Resumen del día — ${tenant.name} — ${dateFormatted}`,
        html,
      });

      results.push({ tenant: tenant.name, status: 'sent', recipients: recipients.length });
    } catch (err) {
      console.error(`[cron] Error sending summary for tenant ${tenant.name}:`, err.message);
      results.push({ tenant: tenant.name, status: 'error', error: err.message });
    }
  }

  return results;
};

module.exports = { sendDailySummary };
