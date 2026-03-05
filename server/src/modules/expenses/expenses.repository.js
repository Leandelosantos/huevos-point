const { Expense } = require('../../models');

const create = async (data) => {
  return Expense.create(data);
};

const findAll = async (filters = {}) => {
  const where = {};
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
