const productsRepository = require('./products.repository');
const { SaleItem } = require('../../models');
const sequelize = require('../../config/database');
const AppError = require('../../utils/AppError');

const getAllProducts = async (tenantId) => {
  return productsRepository.findAllActive(tenantId);
};

const getProductById = async (id, tenantId) => {
  const product = await productsRepository.findById(id, tenantId);
  if (!product || !product.isActive) {
    throw new AppError('Producto no encontrado', 404);
  }
  return product;
};

const createProduct = async (data, tenantId) => {
  return productsRepository.create(data, tenantId);
};

const updateProduct = async (id, data, tenantId) => {
  const product = await productsRepository.update(id, data, tenantId);
  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }
  return product;
};

const deleteProduct = async (id, tenantId) => {
  const product = await productsRepository.findById(id, tenantId);
  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }

  // Check referential integrity: cannot delete if product has sale items
  const hasSales = await SaleItem.count({ where: { productId: id } }); // SaleItem needs scope too conceptually, but product deletion block is safe enough
  if (hasSales > 0) {
    // Soft delete instead
    return productsRepository.softDelete(id, tenantId);
  }

  return productsRepository.softDelete(id, tenantId);
};

const processBulkStock = async (productsData, tenantId) => {
  if (!Array.isArray(productsData) || productsData.length === 0) {
    throw new AppError('Los datos enviados para la carga masiva son inválidos o están vacíos', 400);
  }

  const result = {
    created: 0,
    updated: 0,
  };

  const t = await sequelize.transaction();

  try {
    for (const item of productsData) {
      const { name, stockQuantity = 0, unitPrice = 0 } = item;
      
      if (!name) {
        throw new AppError(`El nombre del producto es obligatorio`, 400);
      }

      // Convert values to avoid precision/type issues
      const parsedStock = parseFloat(stockQuantity);
      const parsedPrice = parseFloat(unitPrice);

      if (isNaN(parsedStock) || isNaN(parsedPrice)) {
        throw new AppError(`Formato numérico inválido para el producto: ${name}`, 400);
      }

      if (!Number.isInteger(parsedStock)) {
        throw new AppError(`La cantidad del producto "${name}" debe ser un número entero.`, 400);
      }

      const existingProduct = await productsRepository.findByName(name, tenantId, { transaction: t });

      if (existingProduct) {
        // Product exists
        // If it was inactive (soft deleted), we activate it.
        // We only accumulate stock / change price if this is an explicit inventory import (stock/price passed).
        // If this is just a catalog import (stock=0, price=0), leave existing stock and price untouched.
        const addStock = parsedStock > 0;
        const setPrice = parsedPrice > 0;

        const newStock = existingProduct.isActive 
          ? (addStock ? parseFloat(existingProduct.stockQuantity) + parsedStock : existingProduct.stockQuantity)
          : (addStock ? parsedStock : existingProduct.stockQuantity);

        await productsRepository.update(existingProduct.id, {
          stockQuantity: newStock,
          unitPrice: setPrice ? parsedPrice : existingProduct.unitPrice,
          isActive: true // ensure it's active in case it was soft-deleted
        }, tenantId, { transaction: t });
        result.updated += 1;
      } else {
        // Product doesn't exist: Create it
        await productsRepository.create({
          name,
          stockQuantity: parsedStock,
          unitPrice: parsedPrice,
          isActive: true
        }, tenantId, { transaction: t });
        result.created += 1;
      }
    }

    await t.commit();
    return result;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  processBulkStock,
};
