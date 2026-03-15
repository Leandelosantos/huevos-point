const { User } = require('../models');

const tenantMiddleware = async (req, res, next) => {
  try {
    // 1. Get tenantId from the user's JWT payload (populated by authMiddleware)
    // By the time this runs, authMiddleware should have already set req.user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado para determinar tenant' });
    }

    // Double check from db to ensure it's still accurate and fetch tenants
    const dbUser = await User.findByPk(req.user.id, {
      include: ['tenants'] // eager load allowed tenants
    });
    
    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ success: false, message: 'Usuario inactivo o no encontrado' });
    }

    const requestedTenantId = req.headers['x-tenant-id'];

    if (dbUser.role === 'superadmin') {
      req.tenantId = requestedTenantId ? parseInt(requestedTenantId, 10) : null;
      return next();
    }

    if (!requestedTenantId) {
      return res.status(400).json({ success: false, message: 'Se requiere ID de sucursal en la cabecera (x-tenant-id)' });
    }

    const allowedTenants = dbUser.tenants.map(t => t.id);
    const parsedTenantId = parseInt(requestedTenantId, 10);

    if (!allowedTenants.includes(parsedTenantId)) {
      return res.status(403).json({ success: false, message: 'No tiene permisos para operar en esta sucursal' });
    }

    // Set isolated tenantId in request context for downstream controllers
    req.tenantId = parsedTenantId;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = tenantMiddleware;
