const purchasesRepository = require('./purchases.repository');
const productRepository = require('../products/products.repository');
const sequelize = require('../../config/database');
const AppError = require('../../utils/AppError');

const createPurchase = async (purchaseData) => {
  const {
    tenantId,
    productId,
    userId,
    quantity,
    cost,
    price,
    marginAmount,
    provider,
    purchaseDate,
  } = purchaseData;

  const t = await sequelize.transaction();

  try {
    // Verificamos producto
    const product = await productRepository.findById(productId, tenantId);
    if (!product) {
      throw new AppError('Producto no encontrado o no pertenece a la sucursal', 404);
    }

    const newPurchase = await purchasesRepository.create(
      {
        tenantId,
        productId,
        userId,
        quantity,
        cost,
        price,
        marginAmount,
        provider,
        purchaseDate,
      },
      t
    );

    // Actualizamos el stock (sumamos) y el nuevo precio de venta
    const previousStock = parseFloat(product.stockQuantity) || 0;
    const newStock = previousStock + parseInt(quantity, 10);

    await product.update(
      {
        stockQuantity: newStock,
        unitPrice: parseFloat(price),
      },
      { transaction: t }
    );

    await t.commit();

    return {
      purchase: newPurchase,
      productName: product.name,
      previousStock,
      newStock,
      previousPrice: product.unitPrice,
      newPrice: price,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

const getPurchases = async (tenantId, query) => {
  return await purchasesRepository.findAll(tenantId, query);
};

module.exports = {
  createPurchase,
  getPurchases,
};
