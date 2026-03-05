const expensesService = require('./expenses.service');
const { createAuditLog } = require('../../utils/auditLogger');

const register = async (req, res, next) => {
  try {
    const { concept, amount } = req.body;
    const expense = await expensesService.registerExpense(req.user.id, concept, amount);

    await createAuditLog({
      userId: req.user.id,
      username: req.user.username,
      actionType: 'EGRESO',
      entity: 'expenses',
      entityId: expense.id,
      description: `Egreso registrado: "${concept}" por $${amount}`,
      newData: expense.toJSON(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: expense,
      message: 'Egreso registrado exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const expenses = await expensesService.getAllExpenses(req.query);
    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, getAll };
