const sequelize = require('../../config/database');
const salesRepository = require('./sales.repository');
const { Product } = require('../../models');
const AppError = require('../../utils/AppError');

const registerSale = async (userId, items, paymentMethod, tenantId, saleDate) => {
  const transaction = await sequelize.transaction();

  try {
    let totalAmount = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.productId, tenantId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!product || !product.isActive) {
        throw new AppError(`Producto con ID ${item.productId} no encontrado`, 404);
      }

      const currentStock = parseFloat(product.stockQuantity);
      const requestedQuantity = parseFloat(item.quantity);

      if (requestedQuantity > currentStock) {
        throw new AppError(
          `Stock insuficiente para "${product.name}". Disponible: ${currentStock}, Solicitado: ${requestedQuantity}`,
          400
        );
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
      });

      // Deduct stock always
      await product.update(
        { stockQuantity: currentStock - requestedQuantity },
        { transaction }
      );
    }

    const sale = await salesRepository.create(
      { 
        userId, 
        totalAmount, 
        paymentMethod, 
        saleDate: saleDate || new Date(),
        status: 'COMPLETED'
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
      status: sale.status
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
