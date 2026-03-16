const { Purchase, Product, User } = require('../../models');

const create = async (purchaseData, transaction) => {
  return await Purchase.create(purchaseData, { transaction });
};

const findAll = async (tenantId, { limit, offset }) => {
  const { count, rows } = await Purchase.findAndCountAll({
    where: { tenantId },
    attributes: {
      include: [
        [
          Purchase.sequelize.literal(`"Purchase"."receipt_data" IS NOT NULL`),
          'hasReceipt',
        ],
      ],
      exclude: ['receiptData', 'receiptMimeType'],
    },
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'fullName'],
      },
    ],
    order: [['purchaseDate', 'DESC'], ['createdAt', 'DESC']],
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });

  return { total: count, purchases: rows };
};

const findReceiptById = async (id, tenantId) => {
  return Purchase.findOne({
    where: { id, tenantId },
    attributes: ['id', 'receiptData', 'receiptMimeType'],
  });
};

module.exports = {
  create,
  findAll,
  findReceiptById,
};
