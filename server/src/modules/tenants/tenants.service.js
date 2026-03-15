const tenantsRepository = require('./tenants.repository');

const getAllActiveTenants = async () => {
  return tenantsRepository.findAllActive();
};

module.exports = { getAllActiveTenants };
