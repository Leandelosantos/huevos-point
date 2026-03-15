const purchasesService = require('./purchases.service');
const AppError = require('../../utils/AppError');
const { createAuditLog } = require('../../utils/auditLogger');

const createPurchase = async (req, res, next) => {
  try {
    const {
      productId,
      quantity,
      cost,
      price,
      marginAmount,
      provider,
      purchaseDate,
    } = req.body;

    if (!productId || !quantity || cost === undefined || price === undefined || marginAmount === undefined || !purchaseDate) {
      throw new AppError('Faltan datos requeridos (productId, quantity, cost, price, marginAmount, purchaseDate)', 400);
    }

    const tenantId = req.tenantId;
    const userId = req.user.id;

    const result = await purchasesService.createPurchase({
      tenantId,
      productId,
      userId,
      quantity,
      cost,
      price,
      marginAmount,
      provider,
      purchaseDate,
    });

    await createAuditLog({
      userId,
      username: req.user.username,
      tenantId,
      actionType: 'COMPRA_REGISTRADA',
      entity: 'purchases',
      entityId: result.purchase.id,
      description: `Compra registrada: ${quantity} unidades de ${result.productName}. Costo $${cost}, Precio $${price}`,
      previousData: { stock: result.previousStock, price: result.previousPrice },
      newData: { stock: result.newStock, price: result.newPrice },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: result.purchase,
      message: 'Compra registrada con éxito y stock actualizado',
    });
  } catch (error) {
    next(error);
  }
};

const getPurchases = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { page = 1, limit = 50 } = req.query;

    const offset = (page - 1) * limit;

    const result = await purchasesService.getPurchases(tenantId, { limit, offset });

    res.status(200).json({
      success: true,
      data: {
        total: result.total,
        purchases: result.purchases,
        totalPages: Math.ceil(result.total / limit),
        currentPage: parseInt(page, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPurchase,
  getPurchases,
};
