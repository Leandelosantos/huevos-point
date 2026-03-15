const { User, Tenant } = require('../../models');

const findAll = async () => {
  return User.findAll({
    attributes: { exclude: ['password'] },
    include: [{ model: Tenant, as: 'tenants', attributes: ['id', 'name'], through: { attributes: [] } }],
    order: [['createdAt', 'DESC']],
  });
};

const findById = async (id) => {
  return User.findByPk(id, {
    attributes: { exclude: ['password'] },
    include: [{ model: Tenant, as: 'tenants', attributes: ['id', 'name'], through: { attributes: [] } }],
  });
};

const findByUsername = async (username) => {
  return User.findOne({ where: { username } });
};

const findByEmail = async (email) => {
  return User.findOne({ where: { email } });
};

const create = async (userData, tenantIds = []) => {
  const user = await User.create(userData);
  if (tenantIds && tenantIds.length > 0) {
    await user.setTenants(tenantIds);
  }
  return user;
};

const update = async (id, updateData, tenantIds = []) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  
  await user.update(updateData);
  
  if (updateData.role === 'superadmin') {
    await user.setTenants([]);
  } else if (tenantIds && tenantIds.length > 0) {
    await user.setTenants(tenantIds);
  }
  
  return user;
};

const deactivate = async (id) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  return user.update({ isActive: false });
};

module.exports = {
  findAll,
  findById,
  findByUsername,
  findByEmail,
  create,
  update,
  deactivate,
};
