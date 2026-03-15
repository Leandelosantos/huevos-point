const { Expense } = require('../../models');

const create = async (data, tenantId) => {
  return Expense.create({ ...data, tenantId });
};

const findAll = async (tenantId, filters = {}) => {
  const where = { tenantId };
  if (filters.date) {
    where.expenseDate = filters.date;
  }

  return Expense.findAll({
    where,
    include: [
      { association: 'user', attributes: ['username', 'fullName'] },
    ],
    order: [['createdAt', 'DESC']],
  });
};

module.exports = { create, findAll };
