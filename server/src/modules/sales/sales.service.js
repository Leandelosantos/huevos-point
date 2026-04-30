const sequelize = require('../../config/database');
const salesRepository = require('./sales.repository');
const { Product, EggCategory } = require('../../models');
const AppError = require('../../utils/AppError');

const registerSale = async (userId, items, paymentSplits, tenantId, saleDate) => {
  const transaction = await sequelize.transaction();

  try {
    let totalAmount = 0;
    const saleItems = [];

    // Cache categories to avoid multiple locks on same category within one sale
    const categoryCache = {};

    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.productId, tenantId },
        transaction,
      });

      if (!product || !product.isActive) {
        throw new AppError(`Producto con ID ${item.productId} no encontrado`, 404);
      }

      const requestedQuantity = parseFloat(item.quantity);

      if (product.categoryId) {
        // ── Egg product: deduct from category stock ──────────────────────
        const eggsNeeded = requestedQuantity * (product.unitsPerPresentation || 1);

        if (!categoryCache[product.categoryId]) {
          const category = await EggCategory.findOne({
            where: { id: product.categoryId, tenantId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          if (!category) {
            throw new AppError(`Categoría del producto "${product.name}" no encontrada`, 404);
          }
          categoryCache[product.categoryId] = category;
        }

        const category = categoryCache[product.categoryId];
        const currentCategoryStock = parseFloat(category.stockUnits);

        if (eggsNeeded > currentCategoryStock) {
          const availablePresentation = Math.floor(currentCategoryStock / (product.unitsPerPresentation || 1));
          throw new AppError(
            `Stock insuficiente para "${product.name}". Disponible: ${availablePresentation}, Solicitado: ${requestedQuantity}`,
            400
          );
        }

        const newCategoryStock = currentCategoryStock - eggsNeeded;
        await category.update({ stockUnits: newCategoryStock }, { transaction });
        category.stockUnits = newCategoryStock;

      } else {
        // ── Generic product: deduct from product.stockQuantity ────────────
        const currentStock = product.stockQuantity || 0;
        if (requestedQuantity > currentStock) {
          throw new AppError(
            `Stock insuficiente para "${product.name}". Disponible: ${currentStock}, Solicitado: ${requestedQuantity}`,
            400
          );
        }
        await product.update({ stockQuantity: currentStock - requestedQuantity }, { transaction });
      }

      const unitPrice = parseFloat(product.unitPrice);
      const discountPercentage = parseFloat(item.discount || 0);
      let subtotal = requestedQuantity * unitPrice;

      if (discountPercentage > 0) {
        subtotal = subtotal * (1 - discountPercentage / 100);
      }

      totalAmount += subtotal;

      saleItems.push({
        productId: product.id,
        quantity: requestedQuantity,
        unitPrice,
        subtotal,
        discount: discountPercentage,
        discountConcept: discountPercentage > 0 ? (item.discountConcept || null) : null,
      });
    }

    // Normalize splits: if single split with no amount, amount = total
    const normalizedSplits = paymentSplits.length === 1
      ? [{ method: paymentSplits[0].method, amount: totalAmount }]
      : paymentSplits.map(s => ({ method: s.method, amount: parseFloat(s.amount) }));

    if (normalizedSplits.length > 1) {
      const splitSum = normalizedSplits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitSum - totalAmount) > 0.05) {
        throw new AppError('La suma de los métodos de pago no coincide con el total de la venta', 400);
      }
    }

    const primaryPaymentMethod = normalizedSplits[0].method;

    const sale = await salesRepository.create(
      {
        userId,
        totalAmount,
        paymentMethod: primaryPaymentMethod,
        paymentSplits: normalizedSplits.length > 1 ? JSON.stringify(normalizedSplits) : null,
        saleDate: saleDate || new Date(),
      },
      saleItems,
      tenantId,
      transaction
    );

    await transaction.commit();

    return {
      saleId: sale.id,
      totalAmount,
      items: saleItems,
      paymentSplits: normalizedSplits,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getAllSales = async (tenantId, filters) => {
  return salesRepository.findAll(tenantId, filters);
};

module.exports = { registerSale, getAllSales };
