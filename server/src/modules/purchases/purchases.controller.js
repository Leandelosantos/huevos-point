const purchasesService = require('./purchases.service');
const AppError = require('../../utils/AppError');
const { createAuditLog } = require('../../utils/auditLogger');

const createPurchase = async (req, res, next) => {
  try {
    const {
      categoryId,
      productId,
      quantity,
      cost,
      price,
      provider,
      purchaseDate,
      receiptData,
      receiptMimeType,
    } = req.body;

    if (!categoryId && !productId) {
      throw new AppError('Debe especificar categoryId (huevos) o productId (producto general)', 400);
    }
    if (categoryId && productId) {
      throw new AppError('Especifique categoryId o productId, no ambos', 400);
    }
    if (!quantity || cost === undefined || !purchaseDate) {
      throw new AppError('Faltan datos requeridos (quantity, cost, purchaseDate)', 400);
    }

    const tenantId = req.tenantId;
    const userId = req.user.id;

    const result = await purchasesService.createPurchase({
      tenantId,
      categoryId: categoryId || null,
      productId: productId || null,
      userId,
      quantity,
      cost,
      price: price || null,
      provider,
      purchaseDate,
      receiptData: receiptData || null,
      receiptMimeType: receiptMimeType || null,
    });

    const description = result.eggsAdded != null
      ? `Compra registrada: ${quantity} cajones de ${result.categoryName}. +${result.eggsAdded} huevos. Costo $${cost}/cajón`
      : `Compra registrada: ${quantity} unidades de ${result.productName}. Stock: ${result.previousStock} → ${result.newStock}. Costo $${cost}/u`;

    await createAuditLog({
      userId,
      username: req.user.username,
      tenantId,
      actionType: 'COMPRA_REGISTRADA',
      entity: 'purchases',
      entityId: result.purchase.id,
      description,
      previousData: { stock: result.previousStock },
      newData: { stock: result.newStock },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: result.purchase,
      message: `Compra registrada: +${result.eggsAdded} huevos de ${result.categoryName}`,
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

const getReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const result = await purchasesService.getPurchaseReceipt(id, tenantId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPurchase,
  getPurchases,
  getReceipt,
};
