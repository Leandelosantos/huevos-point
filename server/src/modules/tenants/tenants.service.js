const tenantsRepository = require('./tenants.repository');
const AppError = require('../../utils/AppError');

const getAllActiveTenants = async () => {
  return tenantsRepository.findAllActive();
};

const getCurrentTenant = async (tenantId) => {
  const tenant = await tenantsRepository.findById(tenantId);
  if (!tenant) throw new AppError('Sucursal no encontrada', 404);
  return tenant;
};

const updateCurrentTenant = async (tenantId, { name, theme }) => {
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (theme !== undefined) updates.theme = theme;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No hay campos para actualizar', 400);
  }

  const updated = await tenantsRepository.updateById(tenantId, updates);
  if (!updated) throw new AppError('Sucursal no encontrada', 404);
  return updated;
};

const createTenant = async ({ name, userId }) => {
  if (!name || !name.trim()) throw new AppError('El nombre es requerido', 400);
  const tenant = await tenantsRepository.create({ name: name.trim() });
  // Si se provee un userId (admin que crea la sucursal), asignarlo automáticamente
  if (userId) {
    await tenantsRepository.addUserToTenant(tenant.id, userId);
  }
  return tenant;
};

module.exports = { getAllActiveTenants, getCurrentTenant, updateCurrentTenant, createTenant };
