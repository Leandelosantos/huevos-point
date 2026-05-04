const purchasesRepository = require('./purchases.repository');
const sequelize = require('../../config/database');
const { EggCategory, Product } = require('../../models');
const AppError = require('../../utils/AppError');
// EGGS_PER_CRATE not imported; use category.eggsPerCrate (per-category config)

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

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseReceipt,
  updatePurchase,
  deletePurchase,
};
