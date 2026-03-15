const tenantsService = require('./tenants.service');

const getAll = async (req, res, next) => {
  try {
    const tenants = await tenantsService.getAllActiveTenants();
    res.json({ success: true, data: tenants });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll };
