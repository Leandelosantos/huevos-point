const productsRepository = require('./products.repository');
const { SaleItem } = require('../../models');
const sequelize = require('../../config/database');
const AppError = require('../../utils/AppError');

const getAllProducts = async () => {
  return productsRepository.findAllActive();
};

const getProductById = async (id) => {
  const product = await productsRepository.findById(id);
  if (!product || !product.isActive) {
    throw new AppError('Producto no encontrado', 404);
  }
  return product;
};

const createProduct = async (data) => {
  return productsRepository.create(data);
};

const updateProduct = async (id, data) => {
  const product = await productsRepository.update(id, data);
  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }
  return product;
};

const deleteProduct = async (id) => {
  const product = await productsRepository.findById(id);
  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }

  // Check referential integrity: cannot delete if product has sale items
  const hasSales = await SaleItem.count({ where: { productId: id } });
  if (hasSales > 0) {
    // Soft delete instead
    return productsRepository.softDelete(id);
  }

  return productsRepository.softDelete(id);
};

const processBulkStock = async (productsData) => {
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
      const { name, stockQuantity, unitPrice } = item;
      
      if (!name || stockQuantity === undefined || unitPrice === undefined) {
        throw new AppError(`Datos inválidos en el producto: ${name || 'Desconocido'}`, 400);
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

      const existingProduct = await productsRepository.findByName(name, { transaction: t });

      if (existingProduct) {
        // Product exists
        // If it was inactive (soft deleted), we assume the uploaded stock is the absolute new stock.
        // If active, we accumulate the uploaded stock to the current stock.
        const newStock = existingProduct.isActive 
          ? parseFloat(existingProduct.stockQuantity) + parsedStock 
          : parsedStock;

        await productsRepository.update(existingProduct.id, {
          stockQuantity: newStock,
          unitPrice: parsedPrice,
          isActive: true // ensure it's active in case it was soft-deleted
        }, { transaction: t });
        result.updated += 1;
      } else {
        // Product doesn't exist: Create it
        await productsRepository.create({
          name,
          stockQuantity: parsedStock,
          unitPrice: parsedPrice,
          isActive: true
        }, { transaction: t });
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
