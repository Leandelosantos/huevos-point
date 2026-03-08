const { Op } = require('sequelize');
const { Product, SaleItem, Sale } = require('../../models');
const sequelize = require('../../config/database');
const dayjs = require('dayjs');

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
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
    return this.getTopProductsForMonth(startOfMonth, endOfMonth);
  }

  async getTopProductsPreviousMonth() {
    const startOfMonth = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const endOfMonth = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
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
