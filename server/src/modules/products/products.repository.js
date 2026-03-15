const { Product } = require('../../models');

const findAllActive = async (tenantId) => {
  return Product.findAll({
    where: { isActive: true, tenantId },
    order: [['name', 'ASC']],
  });
};

const findById = async (id, tenantId) => {
  return Product.findOne({ where: { id, tenantId } });
};

const findByName = async (name, tenantId, options = {}) => {
  return Product.findOne({
    where: { name, tenantId },
    ...options
  });
};

const create = async (data, tenantId, options = {}) => {
  return Product.create({ ...data, tenantId }, options);
};

const update = async (id, data, tenantId, options = {}) => {
  const product = await Product.findOne({ where: { id, tenantId }, ...options });
  if (!product) return null;
  return product.update(data, options);
};

const softDelete = async (id, tenantId, options = {}) => {
  const product = await Product.findOne({ where: { id, tenantId }, ...options });
  if (!product) return null;
  return product.update({ isActive: false }, options);
};

module.exports = { findAllActive, findById, findByName, create, update, softDelete };
