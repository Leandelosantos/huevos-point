const { Purchase, Product, User, EggCategory, Sale, CashWithdrawal } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

// ── Payment method grouping ─────────────────────────────────────────────────
const DIGITAL_METHODS = ['Mercado Pago - Posnet', 'Transferencia', 'Cuenta DNI'];

const classifyMethod = (method) => {
  if (!method || method === 'Efectivo') return 'efectivo';
  if (method === 'Rappi') return 'rappi';
  if (DIGITAL_METHODS.includes(method)) return 'digital';
  return 'digital'; // fallback for unknown digital methods
};

const create = async (purchaseData, transaction) => {
  return await Purchase.create(purchaseData, { transaction });
};

const findById = async (id, tenantId) => {
  return Purchase.findOne({
    where: { id, tenantId },
    include: [
      { model: Product, as: 'product', attributes: ['id', 'name', 'stockQuantity'], required: false },
      { model: EggCategory, as: 'category', attributes: ['id', 'name', 'eggsPerCrate', 'stockUnits'], required: false },
    ],
  });
};

const update = async (id, data, tenantId, transaction) => {
  const [count] = await Purchase.update(data, { where: { id, tenantId }, transaction });
  return count;
};

const remove = async (id, tenantId, transaction) => {
  return Purchase.destroy({ where: { id, tenantId }, transaction });
};

const findAll = async (tenantId, { limit, offset }) => {
  const { count, rows } = await Purchase.findAndCountAll({
    where: { tenantId },
    attributes: {
      include: [
        [
          Purchase.sequelize.literal(`"Purchase"."receipt_data" IS NOT NULL`),
          'hasReceipt',
        ],
      ],
      exclude: ['receiptData', 'receiptMimeType'],
    },
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: EggCategory,
        as: 'category',
        attributes: ['id', 'name', 'eggsPerCrate'],
        required: false,
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'fullName'],
      },
    ],
    order: [['purchaseDate', 'DESC'], ['createdAt', 'DESC']],
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });

  return { total: count, purchases: rows };
};

const findReceiptById = async (id, tenantId) => {
  return Purchase.findOne({
    where: { id, tenantId },
    attributes: ['id', 'receiptData', 'receiptMimeType'],
  });
};

// ── Cash registers (computed from sales) ──────────────────────────────────

const getSalesByMonth = async (tenantId, year, month) => {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10); // last day of month
  return Sale.findAll({
    where: {
      tenantId,
      saleDate: { [Op.between]: [start, end] },
    },
    attributes: ['id', 'totalAmount', 'paymentMethod', 'paymentSplits', 'saleDate'],
    order: [['saleDate', 'ASC']],
  });
};

const getWithdrawalsByMonth = async (tenantId, year, month) => {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  return CashWithdrawal.findAll({
    where: {
      tenantId,
      withdrawalDate: { [Op.between]: [start, end] },
    },
    attributes: ['id', 'withdrawalDate', 'source', 'type', 'amount', 'concept'],
    order: [['withdrawalDate', 'ASC']],
  });
};

const getEggDebtTotal = async (tenantId) => {
  // Total cost of all egg purchases (category-based)
  const [purchaseResult] = await sequelize.query(`
    SELECT COALESCE(SUM(quantity * cost), 0) AS total
    FROM purchases
    WHERE tenant_id = :tenantId AND category_id IS NOT NULL
  `, { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT });

  // Total paid via deuda_huevos withdrawals (all time)
  const [paidResult] = await sequelize.query(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM cash_withdrawals
    WHERE tenant_id = :tenantId AND type = 'deuda_huevos'
  `, { replacements: { tenantId }, type: sequelize.QueryTypes.SELECT });

  return {
    totalPurchased: parseFloat(purchaseResult.total),
    totalPaid: parseFloat(paidResult.total),
    debtAmount: parseFloat(purchaseResult.total) - parseFloat(paidResult.total),
  };
};

const createWithdrawal = async (data, transaction) => {
  return CashWithdrawal.create(data, { transaction });
};

// ── Helpers ─────────────────────────────────────────────────────────────────

// Compute per-method totals for a list of sales
const computeSaleTotals = (sales) => {
  const byDate = {};
  for (const sale of sales) {
    const dateKey = sale.saleDate;
    if (!byDate[dateKey]) {
      byDate[dateKey] = { date: dateKey, efectivo: 0, digital: 0, rappi: 0, total: 0 };
    }
    const entry = byDate[dateKey];

    if (sale.paymentSplits) {
      let splits;
      try { splits = JSON.parse(sale.paymentSplits); } catch { splits = null; }
      if (Array.isArray(splits)) {
        for (const sp of splits) {
          const bucket = classifyMethod(sp.method);
          const amt = parseFloat(sp.amount) || 0;
          entry[bucket] += amt;
          entry.total += amt;
        }
        continue;
      }
    }
    const bucket = classifyMethod(sale.paymentMethod);
    const amt = parseFloat(sale.totalAmount) || 0;
    entry[bucket] += amt;
    entry.total += amt;
  }
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
};

module.exports = {
  create,
  findAll,
  findById,
  update,
  remove,
  findReceiptById,
  getSalesByMonth,
  getWithdrawalsByMonth,
  getEggDebtTotal,
  createWithdrawal,
  computeSaleTotals,
  classifyMethod,
};
