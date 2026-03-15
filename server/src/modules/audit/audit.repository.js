const { AuditLog, User } = require('../../models');
const { Op } = require('sequelize');

const findAll = async (tenantId, filters = {}) => {
  const where = {};

  if (filters.startDate && filters.endDate) {
    where.createdAt = {
      [Op.between]: [
        new Date(`${filters.startDate}T00:00:00`),
        new Date(`${filters.endDate}T23:59:59`),
      ],
    };
  } else if (filters.startDate) {
    where.createdAt = { [Op.gte]: new Date(`${filters.startDate}T00:00:00`) };
  }

  if (filters.actionType) {
    where.actionType = filters.actionType;
  }

  if (filters.username) {
    where.username = { [Op.iLike]: `%${filters.username}%` };
  }

  if (tenantId) {
    where.tenantId = tenantId;
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: [], // Only for joining
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(filters.limit, 10) || 50,
    offset: parseInt(filters.offset, 10) || 0,
  });

  return { total: count, logs: rows };
};

module.exports = { findAll };
