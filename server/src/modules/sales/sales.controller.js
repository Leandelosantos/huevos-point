const salesService = require('./sales.service');
const { createAuditLog } = require('../../utils/auditLogger');

const register = async (req, res, next) => {
  try {
    const { items, paymentSplits, paymentMethod, saleDate } = req.body;

    // Support both new (paymentSplits array) and legacy (paymentMethod string)
    const splits = (paymentSplits && paymentSplits.length > 0)
      ? paymentSplits
      : paymentMethod ? [{ method: paymentMethod, amount: null }] : null;

    if (!splits || !splits[0]?.method) {
      return res.status(400).json({ success: false, message: 'El método de pago es requerido' });
    }

    const result = await salesService.registerSale(req.user.id, items, splits, req.tenantId, saleDate);

    const methodsStr = [...new Set(splits.map(s => s.method))].join(' + ');
    await createAuditLog({
      tenantId: req.tenantId || null,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'VENTA',
      entity: 'sales',
      entityId: result.saleId,
      description: `Venta registrada por $${result.totalAmount} (${result.items.length} producto/s en ${methodsStr})`,
      newData: result,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Venta registrada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const sales = await salesService.getAllSales(req.tenantId, req.query);
    res.json({ success: true, data: sales });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, getAll };
