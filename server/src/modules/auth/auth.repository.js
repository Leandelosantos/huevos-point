const { User, Tenant } = require('../../models');

const findByUsername = async (username) => {
  return User.findOne({
    where: { username, isActive: true },
    include: [{ model: Tenant, as: 'tenants', attributes: ['id', 'name'], through: { attributes: [] } }],
  });
};

const findById = async (id) => {
  return User.findByPk(id, { attributes: { exclude: ['password'] } });
};

const findAllTenants = async () => {
  return Tenant.findAll({
    where: { isActive: true },
    attributes: ['id', 'name'],
  });
};

module.exports = { findByUsername, findById, findAllTenants };
