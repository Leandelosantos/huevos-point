const { Op } = require('sequelize');
const { Product, SaleItem, Sale } = require('../../models');
const sequelize = require('../../config/database');

class MetricsService {
  async getTopProductsForMonth(startDate, endDate, tenantId) {
    const query = `
      SELECT 
        p.id AS "productId", 
        p.name AS "name", 
        SUM(si.quantity) AS "totalSold"
      FROM sale_items si
      INNER JOIN sales s ON si.sale_id = s.id
      INNER JOIN products p ON si.product_id = p.id
      WHERE s.status = 'COMPLETED'
        AND s.sale_date BETWEEN :startDate AND :endDate
        AND s.tenant_id = :tenantId
      GROUP BY p.id, p.name
      ORDER BY "totalSold" DESC
      LIMIT 10
    `;

    const topProducts = await sequelize.query(query, {
      replacements: { startDate, endDate, tenantId },
      type: sequelize.QueryTypes.SELECT,
    });

    return topProducts.map((item) => ({
      productId: item.productId,
      name: item.name,
      totalSold: parseFloat(item.totalSold),
    }));
  }

  async getTopProductsCurrentMonth(tenantId) {
    const now = new Date();
    // month is 0-indexed, so getMonth() is current month. Day 1 is start, Day 0 of next month is end.
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return this.getTopProductsForMonth(startOfMonth, endOfMonth, tenantId);
  }

  async getTopProductsPreviousMonth(tenantId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    return this.getTopProductsForMonth(startOfMonth, endOfMonth, tenantId);
  }

  async getLowStockProducts(tenantId) {
    const products = await Product.findAll({
      where: {
        stockQuantity: {
          [Op.lt]: 30,
        },
        isActive: true,
        tenantId,
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
