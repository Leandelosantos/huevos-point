const { Tenant } = require('../../models');

const findAllActive = async () => {
  return Tenant.findAll({ 
    where: { isActive: true },
    order: [['name', 'ASC']]
  });
};

module.exports = { findAllActive };
