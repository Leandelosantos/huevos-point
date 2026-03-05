const salesService = require('./sales.service');
const { createAuditLog } = require('../../utils/auditLogger');

const register = async (req, res, next) => {
  try {
    const { items, paymentMethod } = req.body;
    
    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'El método de pago es requerido' });
    }

    const result = await salesService.registerSale(req.user.id, items, paymentMethod);

    await createAuditLog({
      userId: req.user.id,
      username: req.user.username,
      actionType: 'VENTA',
      entity: 'sales',
      entityId: result.saleId,
      description: `Venta registrada por $${result.totalAmount} (${result.items.length} producto/s en ${paymentMethod})`,
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
    const sales = await salesService.getAllSales(req.query);
    res.json({ success: true, data: sales });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, getAll };
