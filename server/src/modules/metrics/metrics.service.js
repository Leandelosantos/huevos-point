const { Op } = require('sequelize');
const { Product, SaleItem, Sale } = require('../../models');
const sequelize = require('../../config/database');

class MetricsService {
  async getTopProductsForMonth(startDate, endDate) {
    const topProducts = await SaleItem.findAll({
      attributes: [
        'productId',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold'],
      ],
      include: [
        {
          model: Sale,
          as: 'sale',
          attributes: [],
          where: {
            status: 'COMPLETED',
            saleDate: {
              [Op.between]: [startDate, endDate],
            },
          },
        },
        {
          model: Product,
          as: 'product',
          attributes: ['name'],
        },
      ],
      group: ['productId', 'product.id'],
      order: [[sequelize.col('totalSold'), 'DESC']],
      limit: 10,
    });

    return topProducts.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      totalSold: parseFloat(item.dataValues.totalSold),
    }));
  }

  async getTopProductsCurrentMonth() {
    const now = new Date();
    // month is 0-indexed, so getMonth() is current month. Day 1 is start, Day 0 of next month is end.
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return this.getTopProductsForMonth(startOfMonth, endOfMonth);
  }

  async getTopProductsPreviousMonth() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    return this.getTopProductsForMonth(startOfMonth, endOfMonth);
  }

  async getLowStockProducts() {
    const products = await Product.findAll({
      where: {
        stockQuantity: {
          [Op.lt]: 30,
        },
        isActive: true,
      },
      attributes: ['id', 'name', 'stockQuantity'],
      order: [['stockQuantity', 'ASC']],
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      stockQuantity: parseFloat(product.stockQuantity),
    }));
  }
}

module.exports = new MetricsService();
