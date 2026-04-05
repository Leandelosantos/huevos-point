const tenantsService = require('./tenants.service');

const getAll = async (req, res, next) => {
  try {
    const tenants = await tenantsService.getAllActiveTenants();
    res.json({ success: true, data: tenants });
  } catch (error) {
    next(error);
  }
};

const getCurrent = async (req, res, next) => {
  try {
    const tenant = await tenantsService.getCurrentTenant(req.tenantId);
    res.json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};

const updateCurrent = async (req, res, next) => {
  try {
    const { name, theme } = req.body;
    const updated = await tenantsService.updateCurrentTenant(req.tenantId, { name, theme });
    res.json({ success: true, data: updated, message: 'Sucursal actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

const createTenant = async (req, res, next) => {
  try {
    const { name } = req.body;
    // Los admins (no superadmin) quedan auto-asignados a la nueva sucursal
    const userId = req.user.role !== 'superadmin' ? req.user.id : null;
    const tenant = await tenantsService.createTenant({ name, userId, currentTenantId: req.tenantId });
    res.status(201).json({ success: true, data: tenant, message: 'Sucursal creada correctamente' });
  } catch (error) {
    next(error);
  }
};

const deleteTenant = async (req, res, next) => {
  try {
    await tenantsService.deleteTenant(req.params.id, req.tenantId);
    res.json({ success: true, message: 'Sucursal eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getCurrent, updateCurrent, createTenant, deleteTenant };
