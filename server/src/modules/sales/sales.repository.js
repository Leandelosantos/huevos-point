const { Sale, SaleItem } = require('../../models');

const create = async (saleData, itemsData, tenantId, transaction) => {
  const sale = await Sale.create({ ...saleData, tenantId }, { transaction });

  const itemsWithSaleId = itemsData.map((item) => ({
    ...item,
    saleId: sale.id,
  }));

  await SaleItem.bulkCreate(itemsWithSaleId, { transaction });

  return sale;
};

const findAll = async (tenantId, filters = {}) => {
  const where = { tenantId };
  if (filters.date) {
    where.saleDate = filters.date;
  }

  return Sale.findAll({
    where,
    include: [
      { association: 'user', attributes: ['username', 'fullName'] },
      {
        association: 'items',
        include: [{ association: 'product', attributes: ['name'] }],
      },
    ],
    order: [['createdAt', 'DESC']],
  });
};

module.exports = { create, findAll };
