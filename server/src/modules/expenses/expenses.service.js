const expensesRepository = require('./expenses.repository');

const registerExpense = async (userId, concept, amount, tenantId, expenseDate) => {
  return expensesRepository.create({
    userId,
    concept,
    amount,
    expenseDate: expenseDate || new Date(),
  }, tenantId);
};

const getAllExpenses = async (tenantId, filters) => {
  return expensesRepository.findAll(tenantId, filters);
};

module.exports = { registerExpense, getAllExpenses };
