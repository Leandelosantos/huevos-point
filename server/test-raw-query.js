const sequelize = require('./src/config/database');

async function testQuery() {
  await sequelize.authenticate();
  const startDate = '2026-03-01';
  const endDate = '2026-03-31';

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
    GROUP BY p.id, p.name
    ORDER BY "totalSold" DESC
    LIMIT 10
  `;

  const topProducts = await sequelize.query(query, {
    replacements: { startDate, endDate },
    type: sequelize.QueryTypes.SELECT,
  });
  
  console.log(JSON.stringify(topProducts, null, 2));

}
testQuery();
