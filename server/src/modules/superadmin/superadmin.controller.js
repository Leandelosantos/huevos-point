const superadminService = require('./superadmin.service');

const getDashboard = async (req, res, next) => {
  try {
    const data = await superadminService.getDashboard();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getTenants = async (req, res, next) => {
  try {
    const data = await superadminService.getTenants();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getTenantDetail = async (req, res, next) => {
  try {
    const data = await superadminService.getTenantDetail(parseInt(req.params.tenantId));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const suspendTenant = async (req, res, next) => {
  try {
    const tenant = await superadminService.suspendTenant(parseInt(req.params.tenantId));
    res.json({ success: true, data: tenant, message: 'Tenant suspendido correctamente' });
  } catch (error) {
    next(error);
  }
};

const reactivateTenant = async (req, res, next) => {
  try {
    const tenant = await superadminService.reactivateTenant(parseInt(req.params.tenantId));
    res.json({ success: true, data: tenant, message: 'Tenant reactivado correctamente' });
  } catch (error) {
    next(error);
  }
};

const getAuditLog = async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const data = await superadminService.getAuditLog({ limit, offset });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getTenants,
  getTenantDetail,
  suspendTenant,
  reactivateTenant,
  getAuditLog,
};
