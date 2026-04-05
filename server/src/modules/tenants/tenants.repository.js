const { Tenant } = require('../../models');

const findAllActive = async () => {
  return Tenant.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']]
  });
};

const findById = async (id) => {
  return Tenant.findOne({ where: { id, isActive: true } });
};

const updateById = async (id, fields) => {
  const [, [updated]] = await Tenant.update(fields, {
    where: { id },
    returning: true,
  });
  return updated;
};

const create = async (fields) => {
  return Tenant.create(fields);
};

module.exports = { findAllActive, findById, updateById, create };
