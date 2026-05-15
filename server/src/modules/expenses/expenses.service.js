const expensesRepository = require('./expenses.repository');

const registerExpense = async (userId, concept, amount, tenantId, expenseDate, receiptData, receiptMimeType) => {
  return expensesRepository.create({
    userId,
    concept,
    amount,
    expenseDate: expenseDate || new Date(),
    receiptData: receiptData || null,
    receiptMimeType: receiptMimeType || null,
  }, tenantId);
};

const getAllExpenses = async (tenantId, filters) => {
  return expensesRepository.findAll(tenantId, filters);
};

module.exports = { registerExpense, getAllExpenses };
