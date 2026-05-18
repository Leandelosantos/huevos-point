const purchasesService = require('./purchases.service');
const AppError = require('../../utils/AppError');
const { createAuditLog } = require('../../utils/auditLogger');

const createBulk = async (req, res, next) => {
  try {
    const { items, receiptData, receiptMimeType } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Debe incluir al menos un ítem en la compra', 400);
    }

    const results = await purchasesService.createPurchaseBulk({
      items,
      tenantId: req.tenantId,
      userId: req.user.id,
      receiptData,
      receiptMimeType,
    });

    const descriptions = results.map((r) =>
      r.categoryName
        ? `${r.categoryName}: +${r.eggsAdded} huevos`
        : `${r.productName}: stock ${r.previousStock} → ${r.newStock}`
    );

    await createAuditLog({
      userId: req.user.id,
      username: req.user.username,
      tenantId: req.tenantId,
      actionType: 'COMPRA_REGISTRADA',
      entity: 'purchases',
      entityId: null,
      description: `Compra lote (${results.length} ítem${results.length !== 1 ? 's' : ''}): ${descriptions.join(' | ')}`,
      newData: { count: results.length },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: results,
      message: `${results.length} compra${results.length !== 1 ? 's' : ''} registrada${results.length !== 1 ? 's' : ''} exitosamente`,
    });
  } catch (error) {
    next(error);
  }
};

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

const updatePurchase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { quantity, cost, provider, purchaseDate } = req.body;

    const result = await purchasesService.updatePurchase(id, tenantId, { quantity, cost, provider, purchaseDate });

    await createAuditLog({
      userId: req.user.id,
      username: req.user.username,
      tenantId,
      actionType: 'COMPRA_EDITADA',
      entity: 'purchases',
      entityId: parseInt(id, 10),
      description: `Compra #${id} editada. Cantidad: ${result.oldQuantity} → ${result.newQuantity}`,
      previousData: { quantity: result.oldQuantity },
      newData: { quantity: result.newQuantity },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Compra actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

const deletePurchase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const result = await purchasesService.deletePurchase(id, tenantId);

    await createAuditLog({
      userId: req.user.id,
      username: req.user.username,
      tenantId,
      actionType: 'COMPRA_ELIMINADA',
      entity: 'purchases',
      entityId: parseInt(id, 10),
      description: `Compra #${id} eliminada. Stock revertido.`,
      previousData: { quantity: result.purchase.quantity, cost: result.purchase.cost },
      newData: null,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Compra eliminada y stock revertido' });
  } catch (error) {
    next(error);
  }
};

const getCashSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    if (month < 1 || month > 12) return res.status(400).json({ success: false, message: 'Mes inválido' });
    const data = await purchasesService.getCashSummary(req.tenantId, year, month);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const getCashRegisters = async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    if (month < 1 || month > 12) return res.status(400).json({ success: false, message: 'Mes inválido' });
    const data = await purchasesService.getCashRegisters(req.tenantId, year, month);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

const createWithdrawal = async (req, res, next) => {
  try {
    const { withdrawalDate, source, type, amount, concept } = req.body;
    if (!withdrawalDate || !source || !type || !amount) {
      throw new AppError('Faltan campos requeridos: withdrawalDate, source, type, amount', 400);
    }
    const withdrawal = await purchasesService.registerWithdrawal({
      tenantId: req.tenantId,
      userId: req.user.id,
      withdrawalDate,
      source,
      type,
      amount,
      concept,
    });

    const sourceLabel = { efectivo: 'Efectivo', digital: 'Digital (MP/Transferencia/DNI)', rappi: 'Rappi' }[source] || source;
    const typeLabel = type === 'deuda_huevos' ? 'Deuda de huevos' : `Otros — ${concept}`;

    await createAuditLog({
      userId: req.user.id,
      username: req.user.username,
      tenantId: req.tenantId,
      actionType: 'RETIRO_REGISTRADO',
      entity: 'cash_withdrawals',
      entityId: withdrawal.id,
      description: `Retiro de ${sourceLabel}: $${amount} — ${typeLabel}`,
      newData: { source, type, amount, concept },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: withdrawal, message: 'Retiro registrado' });
  } catch (error) { next(error); }
};

const getEggDebt = async (req, res, next) => {
  try {
    const data = await purchasesService.getEggDebt(req.tenantId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

module.exports = {
  createBulk,
  createPurchase,
  getPurchases,
  getReceipt,
  updatePurchase,
  deletePurchase,
  getCashSummary,
  getCashRegisters,
  createWithdrawal,
  getEggDebt,
};
