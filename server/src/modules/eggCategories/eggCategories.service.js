const sequelize = require('../../config/database');
const { EggCategory, Product } = require('../../models');
const AppError = require('../../utils/AppError');

// Standard presentations auto-generated for each category
const PRESENTATIONS = [
  { suffix: 'Cajón', units: 360 },
  { suffix: '1/2 Cajón', units: 180 },
  { suffix: 'Maple', units: 30 },
  { suffix: 'Docena', units: 12 },
  { suffix: '1/2 Docena', units: 6 },
];

const EGGS_PER_CRATE = 360;

const getAll = async (tenantId) => {
  const categories = await EggCategory.findAll({
    where: { tenantId, isActive: true },
    include: [{
      model: Product,
      as: 'presentations',
      where: { isActive: true },
      required: false,
      attributes: ['id', 'name', 'unitPrice', 'unitsPerPresentation'],
    }],
    order: [['name', 'ASC']],
  });

  return categories.map((cat) => {
    const stockUnits = parseFloat(cat.stockUnits) || 0;
    return {
      ...cat.toJSON(),
      stockUnits,
      stockCrates: +(stockUnits / EGGS_PER_CRATE).toFixed(2),
      presentations: (cat.presentations || []).map((p) => ({
        ...p.toJSON(),
        availableStock: Math.floor(stockUnits / p.unitsPerPresentation),
      })),
    };
  });
};

const getById = async (id, tenantId) => {
  const category = await EggCategory.findOne({
    where: { id, tenantId, isActive: true },
    include: [{
      model: Product,
      as: 'presentations',
      where: { isActive: true },
      required: false,
    }],
  });
  if (!category) throw new AppError('Categoría no encontrada', 404);
  return category;
};

const create = async ({ name }, tenantId) => {
  if (!name || !name.trim()) {
    throw new AppError('El nombre de la categoría es obligatorio', 400);
  }

  const existing = await EggCategory.findOne({ where: { name: name.trim(), tenantId } });
  if (existing) {
    throw new AppError(`Ya existe la categoría "${name}"`, 409);
  }

  let category;

  await sequelize.transaction(async (t) => {
    category = await EggCategory.create(
      { name: name.trim(), tenantId, stockUnits: 0 },
      { transaction: t }
    );

    // Auto-generate the 5 presentations
    const products = PRESENTATIONS.map((p) => ({
      name: `${p.suffix} ${name.trim()}`,
      tenantId,
      categoryId: category.id,
      unitsPerPresentation: p.units,
      unitPrice: 0,
      stockQuantity: 0,
      isActive: true,
    }));

    await Product.bulkCreate(products, { transaction: t });
  });

  // Reload with presentations
  return getById(category.id, tenantId);
};

const updateStock = async (id, { stockUnits }, tenantId) => {
  const category = await EggCategory.findOne({ where: { id, tenantId, isActive: true } });
  if (!category) throw new AppError('Categoría no encontrada', 404);

  const parsed = parseFloat(stockUnits);
  if (isNaN(parsed) || parsed < 0) {
    throw new AppError('stockUnits debe ser un número >= 0', 400);
  }

  await category.update({ stockUnits: parsed });
  return category;
};

const remove = async (id, tenantId) => {
  const category = await EggCategory.findOne({ where: { id, tenantId } });
  if (!category) throw new AppError('Categoría no encontrada', 404);

  await sequelize.transaction(async (t) => {
    // Soft-delete presentations
    await Product.update(
      { isActive: false },
      { where: { categoryId: id, tenantId }, transaction: t }
    );
    await category.update({ isActive: false }, { transaction: t });
  });

  return { message: 'Categoría eliminada' };
};

module.exports = { getAll, getById, create, updateStock, remove, EGGS_PER_CRATE, PRESENTATIONS };
