const purchasesRepository = require('./purchases.repository');
const sequelize = require('../../config/database');
const { EggCategory, Product } = require('../../models');
const AppError = require('../../utils/AppError');
const { EGGS_PER_CRATE } = require('../eggCategories/eggCategories.service');

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
      const eggsAdded = parsedQuantity * EGGS_PER_CRATE;

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
      const previousStock = product.stockQuantity || 0;
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

module.exports = {
  createPurchase,
  getPurchases,
  getPurchaseReceipt,
};
