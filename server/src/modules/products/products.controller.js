const productsService = require('./products.service');
const { createAuditLog } = require('../../utils/auditLogger');

const getAll = async (req, res, next) => {
  try {
    const products = await productsService.getAllProducts(req.tenantId);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const product = await productsService.createProduct(req.body, req.tenantId);

    await createAuditLog({
      tenantId: req.tenantId || null,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'PRODUCTO_CREADO',
      entity: 'products',
      entityId: product.id,
      description: `Producto "${product.name}" creado con stock ${product.stockQuantity} y precio $${product.unitPrice}`,
      newData: product.toJSON(),
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: product, message: 'Producto creado exitosamente' });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const previousProduct = await productsService.getProductById(req.params.id, req.tenantId);
    const previousData = previousProduct.toJSON();

    const product = await productsService.updateProduct(req.params.id, req.body, req.tenantId);

    await createAuditLog({
      tenantId: req.tenantId || null,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'PRODUCTO_MODIFICADO',
      entity: 'products',
      entityId: product.id,
      description: `Producto "${product.name}" modificado`,
      previousData,
      newData: product.toJSON(),
      ipAddress: req.ip,
    });

    res.json({ success: true, data: product, message: 'Producto actualizado exitosamente' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const product = await productsService.getProductById(req.params.id, req.tenantId);
    const previousData = product.toJSON();

    await productsService.deleteProduct(req.params.id, req.tenantId);

    await createAuditLog({
      tenantId: req.tenantId || null,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'PRODUCTO_ELIMINADO',
      entity: 'products',
      entityId: product.id,
      description: `Producto "${product.name}" eliminado (desactivación lógica)`,
      previousData,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

const uploadBulk = async (req, res, next) => {
  try {
    const productsData = req.body;

    const result = await productsService.processBulkStock(productsData, req.tenantId);

    await createAuditLog({
      tenantId: req.tenantId || null,
      userId: req.user.id,
      username: req.user.username,
      actionType: 'STOCK_MASIVO_IMPORTADO',
      entity: 'products',
      entityId: null, // Bulk action
      description: `Se importaron ${result.created + result.updated} productos mediante importación masiva (${result.created} creados, ${result.updated} actualizados)`,
      newData: { ...result },
      ipAddress: req.ip,
    });

    res.status(200).json({ 
      success: true, 
      data: result, 
      message: `Se procesaron correctamente ${result.created + result.updated} productos (${result.created} nuevos, ${result.updated} actualizados)` 
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove, uploadBulk };
