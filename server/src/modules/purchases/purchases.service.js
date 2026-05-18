const purchasesRepository = require('./purchases.repository');
const sequelize = require('../../config/database');
const { EggCategory, Product } = require('../../models');
const AppError = require('../../utils/AppError');
// EGGS_PER_CRATE not imported; use category.eggsPerCrate (per-category config)

const createPurchaseBulk = async ({ items, tenantId, userId, receiptData, receiptMimeType }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Debe incluir al menos un ítem en la compra', 400);
  }

  const t = await sequelize.transaction();
  const results = [];

  try {
    for (const item of items) {
      const { categoryId, productId, quantity, cost, price, provider, purchaseDate } = item;

      if (!quantity || parseFloat(quantity) <= 0) {
        throw new AppError('La cantidad debe ser mayor a 0', 400);
      }
      if (!cost || parseFloat(cost) <= 0) {
        throw new AppError('El costo es obligatorio', 400);
      }
      if (!purchaseDate) {
        throw new AppError('La fecha de compra es obligatoria', 400);
      }

      if (categoryId) {
        const category = await EggCategory.findOne({
          where: { id: categoryId, tenantId, isActive: true },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!category) throw new AppError(`Categoría #${categoryId} no encontrada o no pertenece a la sucursal`, 404);

        const parsedQuantity = parseFloat(quantity);
        const eggsAdded = parsedQuantity * (category.eggsPerCrate || 360);
        const previousStock = parseFloat(category.stockUnits) || 0;
        const newStock = previousStock + eggsAdded;

        const purchase = await purchasesRepository.create({
          tenantId,
          categoryId,
          productId: null,
          userId,
          quantity: parsedQuantity,
          cost: parseFloat(cost),
          price: null,
          marginAmount: null,
          provider: provider || null,
          purchaseDate,
          receiptData: receiptData || null,
          receiptMimeType: receiptMimeType || null,
        }, t);

        await category.update({ stockUnits: newStock }, { transaction: t });
        results.push({ purchaseId: purchase.id, categoryName: category.name, eggsAdded, previousStock, newStock });

      } else if (productId) {
        const product = await Product.findOne({
          where: { id: productId, tenantId, isActive: true },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!product) throw new AppError(`Producto #${productId} no encontrado o no pertenece a la sucursal`, 404);

        const parsedQuantity = parseFloat(quantity);
        const previousStock = parseFloat(product.stockQuantity) || 0;
        const newStock = previousStock + parsedQuantity;

        const updates = { stockQuantity: newStock };
        if (price && parseFloat(price) > 0) updates.unitPrice = parseFloat(price);
        await product.update(updates, { transaction: t });

        const purchase = await purchasesRepository.create({
          tenantId,
          categoryId: null,
          productId,
          userId,
          quantity: parsedQuantity,
          cost: parseFloat(cost),
          price: price ? parseFloat(price) : null,
          marginAmount: null,
          provider: provider || null,
          purchaseDate,
          receiptData: receiptData || null,
          receiptMimeType: receiptMimeType || null,
        }, t);

        results.push({ purchaseId: purchase.id, productName: product.name, previousStock, newStock });

      } else {
        throw new AppError('Cada ítem debe tener categoryId o productId', 400);
      }
    }

    await t.commit();
    return results;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const createPurchase = async (purchaseData) => {
  const {
    tenantId,
    categoryId,
    productId,
    userId,
    quantity,
    cost,
    price,
    provider,
    purchaseDate,
    receiptData,
    receiptMimeType,
  } = purchaseData;

  if (!quantity || parseFloat(quantity) <= 0) {
    throw new AppError('La cantidad debe ser mayor a 0', 400);
  }
  if (!cost || parseFloat(cost) <= 0) {
    throw new AppError('El costo es obligatorio', 400);
  }

  const t = await sequelize.transaction();

  try {
    if (categoryId) {
      // ── Egg purchase ──────────────────────────────────────────────────────
      const category = await EggCategory.findOne({
        where: { id: categoryId, tenantId, isActive: true },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!category) {
        throw new AppError('Categoría no encontrada o no pertenece a la sucursal', 404);
      }

      const parsedQuantity = parseFloat(quantity);
      const eggsAdded = parsedQuantity * (category.eggsPerCrate || 360);

      const newPurchase = await purchasesRepository.create(
        {
          tenantId,
          categoryId,
          productId: null,
          userId,
          quantity: parsedQuantity,
          cost: parseFloat(cost),
          price: null,
          marginAmount: null,
          provider,
          purchaseDate,
          receiptData: receiptData || null,
          receiptMimeType: receiptMimeType || null,
        },
        t
      );

      const previousStock = parseFloat(category.stockUnits) || 0;
      const newStock = previousStock + eggsAdded;
      await category.update({ stockUnits: newStock }, { transaction: t });

      await t.commit();
      return { purchase: newPurchase, categoryName: category.name, eggsAdded, previousStock, newStock };

    } else {
      // ── Generic product purchase ──────────────────────────────────────────
      const product = await Product.findOne({
        where: { id: productId, tenantId, isActive: true },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!product) {
        throw new AppError('Producto no encontrado o no pertenece a la sucursal', 404);
      }

      const parsedQuantity = parseFloat(quantity);
      const previousStock = parseFloat(product.stockQuantity) || 0;
      const newStock = previousStock + parsedQuantity;

      const updates = { stockQuantity: newStock };
      if (price && parseFloat(price) > 0) updates.unitPrice = parseFloat(price);
      await product.update(updates, { transaction: t });

      const newPurchase = await purchasesRepository.create(
        {
          tenantId,
          categoryId: null,
          productId,
          userId,
          quantity: parsedQuantity,
          cost: parseFloat(cost),
          price: price ? parseFloat(price) : null,
          marginAmount: null,
          provider,
          purchaseDate,
          receiptData: receiptData || null,
          receiptMimeType: receiptMimeType || null,
        },
        t
      );

      await t.commit();
      return { purchase: newPurchase, productName: product.name, previousStock, newStock };
    }
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const getPurchases = async (tenantId, query) => {
  return await purchasesRepository.findAll(tenantId, query);
};

const getPurchaseReceipt = async (id, tenantId) => {
  const purchase = await purchasesRepository.findReceiptById(id, tenantId);
  if (!purchase || !purchase.receiptData) {
    throw new AppError('Comprobante no encontrado', 404);
  }
  return { receiptData: purchase.receiptData, receiptMimeType: purchase.receiptMimeType };
};

const updatePurchase = async (id, tenantId, updateData) => {
  const { quantity, cost, provider, purchaseDate } = updateData;

  const t = await sequelize.transaction();
  try {
    const purchase = await purchasesRepository.findById(id, tenantId);
    if (!purchase) throw new AppError('Compra no encontrada', 404);

    const oldQuantity = parseFloat(purchase.quantity);
    const newQuantity = quantity !== undefined ? parseFloat(quantity) : oldQuantity;

    if (newQuantity <= 0) throw new AppError('La cantidad debe ser mayor a 0', 400);

    // Apply stock delta only if quantity changed
    const quantityDelta = newQuantity - oldQuantity;

    if (quantityDelta !== 0) {
      if (purchase.categoryId) {
        const category = await EggCategory.findOne({
          where: { id: purchase.categoryId, tenantId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!category) throw new AppError('Categoría no encontrada', 404);
        const eggsDelta = quantityDelta * (category.eggsPerCrate || 360);
        await category.update({ stockUnits: parseFloat(category.stockUnits) + eggsDelta }, { transaction: t });
      } else if (purchase.productId) {
        const product = await Product.findOne({
          where: { id: purchase.productId, tenantId },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (!product) throw new AppError('Producto no encontrado', 404);
        await product.update({ stockQuantity: parseFloat(product.stockQuantity || 0) + quantityDelta }, { transaction: t });
      }
    }

    const fieldsToUpdate = {};
    if (quantity !== undefined) fieldsToUpdate.quantity = newQuantity;
    if (cost !== undefined) fieldsToUpdate.cost = parseFloat(cost);
    if (provider !== undefined) fieldsToUpdate.provider = provider;
    if (purchaseDate !== undefined) fieldsToUpdate.purchaseDate = purchaseDate;

    await purchasesRepository.update(id, fieldsToUpdate, tenantId, t);

    await t.commit();
    return { oldQuantity, newQuantity, quantityDelta };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const deletePurchase = async (id, tenantId) => {
  const t = await sequelize.transaction();
  try {
    const purchase = await purchasesRepository.findById(id, tenantId);
    if (!purchase) throw new AppError('Compra no encontrada', 404);

    const qty = parseFloat(purchase.quantity);

    if (purchase.categoryId) {
      const category = await EggCategory.findOne({
        where: { id: purchase.categoryId, tenantId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (category) {
        const eggsToRemove = qty * (category.eggsPerCrate || 360);
        const newStock = Math.max(0, parseFloat(category.stockUnits) - eggsToRemove);
        await category.update({ stockUnits: newStock }, { transaction: t });
      }
    } else if (purchase.productId) {
      const product = await Product.findOne({
        where: { id: purchase.productId, tenantId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (product) {
        const newStock = Math.max(0, parseFloat(product.stockQuantity || 0) - qty);
        await product.update({ stockQuantity: newStock }, { transaction: t });
      }
    }

    await purchasesRepository.remove(id, tenantId, t);
    await t.commit();
    return { purchase };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// ── Cajas & Deuda ─────────────────────────────────────────────────────────

const getCashSummary = async (tenantId, year, month) => {
  const [sales, withdrawals, debt] = await Promise.all([
    purchasesRepository.getSalesByMonth(tenantId, year, month),
    purchasesRepository.getWithdrawalsByMonth(tenantId, year, month),
    purchasesRepository.getEggDebtTotal(tenantId),
  ]);

  // Monthly raw totals from sales
  const rawTotals = purchasesRepository.computeSaleTotals(sales);
  const monthTotals = rawTotals.reduce(
    (acc, d) => ({ efectivo: acc.efectivo + d.efectivo, digital: acc.digital + d.digital, rappi: acc.rappi + d.rappi }),
    { efectivo: 0, digital: 0, rappi: 0 }
  );

  // Withdrawals for the month, grouped by source
  const withdrawn = withdrawals.reduce(
    (acc, w) => ({ ...acc, [w.source]: (acc[w.source] || 0) + parseFloat(w.amount) }),
    { efectivo: 0, digital: 0, rappi: 0 }
  );

  return {
    month: { year, month },
    efectivo: { gross: monthTotals.efectivo, withdrawn: withdrawn.efectivo, net: monthTotals.efectivo - withdrawn.efectivo },
    digital: { gross: monthTotals.digital, withdrawn: withdrawn.digital, net: monthTotals.digital - withdrawn.digital },
    rappi: { gross: monthTotals.rappi, withdrawn: withdrawn.rappi, net: monthTotals.rappi - withdrawn.rappi },
    eggDebt: debt,
  };
};

const getCashRegisters = async (tenantId, year, month) => {
  const [sales, withdrawals] = await Promise.all([
    purchasesRepository.getSalesByMonth(tenantId, year, month),
    purchasesRepository.getWithdrawalsByMonth(tenantId, year, month),
  ]);

  const dailyTotals = purchasesRepository.computeSaleTotals(sales);

  // Attach withdrawals to each day
  const withdrawalsByDate = {};
  for (const w of withdrawals) {
    const key = w.withdrawalDate;
    if (!withdrawalsByDate[key]) withdrawalsByDate[key] = [];
    withdrawalsByDate[key].push(w);
  }

  return dailyTotals.map((day) => ({
    ...day,
    withdrawals: withdrawalsByDate[day.date] || [],
  }));
};

const registerWithdrawal = async ({ tenantId, userId, withdrawalDate, source, type, amount, concept }) => {
  if (!['efectivo', 'digital', 'rappi'].includes(source)) {
    throw new AppError('source inválido (efectivo | digital | rappi)', 400);
  }
  if (!['deuda_huevos', 'otros'].includes(type)) {
    throw new AppError('type inválido (deuda_huevos | otros)', 400);
  }
  if (type === 'otros' && (!concept || !concept.trim())) {
    throw new AppError('El concepto es obligatorio cuando type es "otros"', 400);
  }
  if (!amount || parseFloat(amount) <= 0) {
    throw new AppError('El importe debe ser mayor a 0', 400);
  }

  // Deuda no puede quedar negativa
  if (type === 'deuda_huevos') {
    const debt = await purchasesRepository.getEggDebtTotal(tenantId);
    if (parseFloat(amount) > debt.debtAmount) {
      throw new AppError(
        `El importe ($${parseFloat(amount).toLocaleString('es-AR')}) supera la deuda actual ($${debt.debtAmount.toLocaleString('es-AR')}). La deuda no puede quedar negativa.`,
        400
      );
    }
  }

  const withdrawal = await purchasesRepository.createWithdrawal({
    tenantId,
    userId,
    withdrawalDate,
    source,
    type,
    amount: parseFloat(amount),
    concept: concept?.trim() || null,
  });

  return withdrawal;
};

const getEggDebt = async (tenantId) => {
  return purchasesRepository.getEggDebtTotal(tenantId);
};

module.exports = {
  createPurchaseBulk,
  createPurchase,
  getPurchases,
  getPurchaseReceipt,
  updatePurchase,
  deletePurchase,
  getCashSummary,
  getCashRegisters,
  registerWithdrawal,
  getEggDebt,
};
