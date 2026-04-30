const eggCategoriesService = require('./eggCategories.service');
const { createAuditLog } = require('../../utils/auditLogger');

const getAll = async (req, res, next) => {
  try {
    const categories = await eggCategoriesService.getAll(req.tenantId);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const category = await eggCategoriesService.create(req.body, req.tenantId);

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'CATEGORIA_CREADA',
      entity: 'egg_categories',
      entityId: category.id,
      description: `Categoría "${category.name}" creada con 5 presentaciones auto-generadas`,
      newData: category.toJSON ? category.toJSON() : category,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: category, message: 'Categoría creada con presentaciones' });
  } catch (error) {
    next(error);
  }
};

const updateStock = async (req, res, next) => {
  try {
    const previous = await eggCategoriesService.getById(req.params.id, req.tenantId);
    const previousStock = parseFloat(previous.stockUnits);

    const category = await eggCategoriesService.updateStock(req.params.id, req.body, req.tenantId);

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'STOCK_AJUSTADO',
      entity: 'egg_categories',
      entityId: category.id,
      description: `Stock de "${category.name}" ajustado: ${previousStock} → ${category.stockUnits} huevos`,
      previousData: { stockUnits: previousStock },
      newData: { stockUnits: parseFloat(category.stockUnits) },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: category, message: 'Stock ajustado' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const category = await eggCategoriesService.getById(req.params.id, req.tenantId);

    await eggCategoriesService.remove(req.params.id, req.tenantId);

    await createAuditLog({
      tenantId: req.tenantId,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'CATEGORIA_ELIMINADA',
      entity: 'egg_categories',
      entityId: category.id,
      description: `Categoría "${category.name}" eliminada`,
      previousData: category.toJSON ? category.toJSON() : category,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Categoría eliminada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, updateStock, remove };
