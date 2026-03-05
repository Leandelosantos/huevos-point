const { Product } = require('../../models');

const findAllActive = async () => {
  return Product.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']],
  });
};

const findById = async (id) => {
  return Product.findByPk(id);
};

const findByName = async (name, options = {}) => {
  return Product.findOne({
    where: { name },
    ...options
  });
};

const create = async (data, options = {}) => {
  return Product.create(data, options);
};

const update = async (id, data, options = {}) => {
  const product = await Product.findByPk(id, options);
  if (!product) return null;
  return product.update(data, options);
};

const softDelete = async (id, options = {}) => {
  const product = await Product.findByPk(id, options);
  if (!product) return null;
  return product.update({ isActive: false }, options);
};

module.exports = { findAllActive, findById, findByName, create, update, softDelete };
