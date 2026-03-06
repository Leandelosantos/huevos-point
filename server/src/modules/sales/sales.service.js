const sequelize = require('../../config/database');
const salesRepository = require('./sales.repository');
const { Product } = require('../../models');
const AppError = require('../../utils/AppError');
const { sendPointOrder } = require('../mercadopago/mercadopago.controller');

const registerSale = async (userId, items, paymentMethod) => {
  const transaction = await sequelize.transaction();
  const isMercadoPago = paymentMethod === 'Mercado Pago';

  try {
    let totalAmount = 0;
    const saleItems = [];
    const itemsDetails = []; // Para enviar info a MP

    for (const item of items) {
      const product = await Product.findByPk(item.productId, {
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
      const subtotal = requestedQuantity * unitPrice;
      totalAmount += subtotal;

      saleItems.push({
        productId: product.id,
        quantity: requestedQuantity,
        unitPrice,
        subtotal,
      });

      itemsDetails.push({ ...item, name: product.name, unitPrice });

      // Deduct stock only if not MP
      if (!isMercadoPago) {
        await product.update(
          { stockQuantity: currentStock - requestedQuantity },
          { transaction }
        );
      }
    }

    const sale = await salesRepository.create(
      { 
        userId, 
        totalAmount, 
        paymentMethod, 
        saleDate: new Date(),
        status: isMercadoPago ? 'PENDING' : 'COMPLETED'
      },
      saleItems,
      transaction
    );

    let pointStatus = null;
    
    if (isMercadoPago) {
      const pointResponse = await sendPointOrder(sale);
      pointStatus = pointResponse.status;
    }

    await transaction.commit();

    return { 
      saleId: sale.id, 
      totalAmount, 
      items: saleItems, 
      status: sale.status, 
      pointStatus
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getAllSales = async (filters) => {
  return salesRepository.findAll(filters);
};

module.exports = { registerSale, getAllSales };
