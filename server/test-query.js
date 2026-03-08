const { Op } = require('sequelize');
const { Product, SaleItem, Sale } = require('./src/models');
const sequelize = require('./src/config/database');

async function testQuery() {
  await sequelize.authenticate();
  const startOfMonth = '2026-03-01';
  const endOfMonth = '2026-03-31';

  const topProducts = await SaleItem.findAll({
    attributes: [
      'productId',
      [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold'],
    ],
    include: [
      {
        model: Sale,
        as: 'sale',
        attributes: ['id', 'status', 'saleDate'],
        where: {
          status: 'COMPLETED',
          saleDate: {
            [Op.between]: [startOfMonth, endOfMonth],
          },
        },
      },
      {
        model: Product,
        as: 'product',
        attributes: ['name'],
      },
    ],
    group: ['productId', 'product.id', 'sale.id'],
    order: [[sequelize.col('totalSold'), 'DESC']],
  });
  
  console.log(JSON.stringify(topProducts.map(i => i.toJSON()), null, 2));

  // Let's also verify raw data
  console.log('--- ALL SALE ITEMS FOR COMPLETED DEALS ---');
  const allSales = await Sale.findAll({ where: { status: 'COMPLETED' }, include: ['items'] });
  console.log(JSON.stringify(allSales.map(s => s.toJSON()), null, 2));

}
testQuery();
