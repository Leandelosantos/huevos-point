const sequelize = require('../../config/database');
const { EggCategory, Product } = require('../../models');
const AppError = require('../../utils/AppError');

const EGGS_PER_CRATE = 360; // default (non-Jumbo)

/**
 * Returns presentation definitions for a given eggsPerCrate value.
 * Docena (12) and 1/2 Docena (6) are always the same.
 * Cajón, 1/2 Cajón, Maple derive from eggsPerCrate:
 *   - Standard: 360, 180, 30  (eggsPerCrate=360)
 *   - Jumbo:    240, 120, 20  (eggsPerCrate=240)
 */
const buildPresentations = (eggsPerCrate) => [
  { suffix: 'Cajón',      units: eggsPerCrate },
  { suffix: '1/2 Cajón',  units: Math.round(eggsPerCrate / 2) },
  { suffix: 'Maple',      units: Math.round(eggsPerCrate / 12) },
  { suffix: 'Docena',     units: 12 },
  { suffix: '1/2 Docena', units: 6 },
];

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
    const eggsPerCrate = cat.eggsPerCrate || EGGS_PER_CRATE;
    return {
      ...cat.toJSON(),
      stockUnits,
      eggsPerCrate,
      stockCrates: +(stockUnits / eggsPerCrate).toFixed(2),
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

const create = async ({ name, eggsPerCrate }, tenantId) => {
  if (!name || !name.trim()) {
    throw new AppError('El nombre de la categoría es obligatorio', 400);
  }

  const parsedEggsPerCrate = parseInt(eggsPerCrate, 10);
  if (isNaN(parsedEggsPerCrate) || parsedEggsPerCrate <= 0) {
    throw new AppError('eggsPerCrate debe ser un entero positivo', 400);
  }

  const existing = await EggCategory.findOne({ where: { name: name.trim(), tenantId, isActive: true } });
  if (existing) {
    throw new AppError(`Ya existe la categoría "${name}"`, 409);
  }

  let category;

  await sequelize.transaction(async (t) => {
    category = await EggCategory.create(
      { name: name.trim(), tenantId, stockUnits: 0, eggsPerCrate: parsedEggsPerCrate },
      { transaction: t }
    );

    // Auto-generate the 5 presentations based on eggsPerCrate
    const presentations = buildPresentations(parsedEggsPerCrate);
    const products = presentations.map((p) => ({
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
    // Soft-delete presentations and clear FK so the category row can be hard-deleted
    // (the UNIQUE constraint on (tenant_id, name) would block future recreation otherwise)
    await Product.update(
      { isActive: false, categoryId: null },
      { where: { categoryId: id, tenantId }, transaction: t }
    );
    await category.destroy({ transaction: t });
  });

  return { message: 'Categoría eliminada' };
};

module.exports = { getAll, getById, create, updateStock, remove, EGGS_PER_CRATE, buildPresentations };
