const { Sale, Expense, SaleItem, Product, User } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

const getDailySummary = async (date) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const salesTotal = await Sale.sum('totalAmount', {
    where: { saleDate: targetDate },
  }) || 0;

  const expensesTotal = await Expense.sum('amount', {
    where: { expenseDate: targetDate },
  }) || 0;

  const netBalance = parseFloat(salesTotal) - parseFloat(expensesTotal);

  return {
    date: targetDate,
    totalIncome: parseFloat(salesTotal),
    totalExpenses: parseFloat(expensesTotal),
    netBalance,
  };
};

const getDailyMovements = async (date) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const sales = await Sale.findAll({
    where: { saleDate: targetDate },
    include: [
      { model: User, as: 'user', attributes: ['username', 'fullName'] },
      {
        model: SaleItem,
        as: 'items',
        include: [{ model: Product, as: 'product', attributes: ['name'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  const expenses = await Expense.findAll({
    where: { expenseDate: targetDate },
    include: [
      { model: User, as: 'user', attributes: ['username', 'fullName'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  const movements = [
    ...sales.map((sale) => ({
      id: sale.id,
      type: 'VENTA',
      amount: parseFloat(sale.totalAmount),
      paymentMethod: sale.paymentMethod || 'Efectivo',
      description: sale.items.map((item) =>
        `${item.product?.name || 'Producto'} x${item.quantity}`
      ).join(' + '),
      details: sale.items.map((item) => ({
        productName: item.product?.name || 'Producto',
        quantity: item.quantity,
      })),
      user: sale.user?.fullName || sale.user?.username,
      createdAt: sale.createdAt,
    })),
    ...expenses.map((expense) => ({
      id: expense.id,
      type: 'EGRESO',
      amount: parseFloat(expense.amount),
      paymentMethod: 'Caja',
      description: expense.concept,
      details: [],
      user: expense.user?.fullName || expense.user?.username,
      createdAt: expense.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return movements;
};

module.exports = { getDailySummary, getDailyMovements };
