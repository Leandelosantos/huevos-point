const { Sale, Expense, SaleItem, Product, User } = require('../../models');

const getDailySummary = async (date, tenantId) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const salesTotal = await Sale.sum('totalAmount', {
    where: { saleDate: targetDate, tenantId },
  }) || 0;

  const expensesTotal = await Expense.sum('amount', {
    where: { expenseDate: targetDate, tenantId },
  }) || 0;

  const netBalance = parseFloat(salesTotal) - parseFloat(expensesTotal);

  return {
    date: targetDate,
    totalIncome: parseFloat(salesTotal),
    totalExpenses: parseFloat(expensesTotal),
    netBalance,
  };
};

const getDailyMovements = async (date, tenantId) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const sales = await Sale.findAll({
    where: { saleDate: targetDate, tenantId },
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
    where: { expenseDate: targetDate, tenantId },
    include: [
      { model: User, as: 'user', attributes: ['username', 'fullName'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  const movements = [
    ...sales.map((sale) => {
      const totalDiscount = sale.items.reduce((acc, item) => {
        const itemDiscount = parseFloat(item.discount || 0);
        if (itemDiscount > 0) {
          return acc + (parseFloat(item.quantity) * parseFloat(item.unitPrice) * (itemDiscount / 100));
        }
        return acc;
      }, 0);

      return {
        id: sale.id,
        type: 'VENTA',
        amount: parseFloat(sale.totalAmount),
        discountAmount: totalDiscount,
        paymentMethod: sale.paymentMethod || 'Efectivo',
        paymentSplits: sale.paymentSplits ? JSON.parse(sale.paymentSplits) : null,
        description: sale.items.map((item) =>
          `${item.product?.name || 'Producto'} x${item.quantity}${item.discount > 0 ? ` (-${item.discount}%)` : ''}`
        ).join(' + '),
        details: sale.items.map((item) => ({
          productName: item.product?.name || 'Producto',
          quantity: item.quantity,
          discount: item.discount,
          discountConcept: item.discountConcept || null,
        })),
        user: sale.user?.fullName || sale.user?.username,
        createdAt: sale.createdAt,
      };
    }),
    ...expenses.map((expense) => ({
      id: expense.id,
      type: 'EGRESO',
      amount: parseFloat(expense.amount),
      discountAmount: 0,
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
