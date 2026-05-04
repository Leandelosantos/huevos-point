const { Product, EggCategory } = require('../../models');

const findAllActive = async (tenantId) => {
  return Product.findAll({
    where: { isActive: true, tenantId },
    include: [{
      model: EggCategory,
      as: 'category',
      attributes: ['id', 'name', 'stockUnits'],
      required: false,
    }],
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

const softDeleteAllGeneric = async (tenantId, options = {}) => {
  const { Op } = require('sequelize');
  return Product.update(
    { isActive: false },
    { where: { tenantId, categoryId: null, isActive: true }, ...options }
  );
};

module.exports = { findAllActive, findById, findByName, create, update, softDelete, softDeleteAllGeneric };
