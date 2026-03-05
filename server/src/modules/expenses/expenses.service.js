const expensesRepository = require('./expenses.repository');

const registerExpense = async (userId, concept, amount) => {
  return expensesRepository.create({
    userId,
    concept,
    amount,
    expenseDate: new Date(),
  });
};

const getAllExpenses = async (filters) => {
  return expensesRepository.findAll(filters);
};

module.exports = { registerExpense, getAllExpenses };
