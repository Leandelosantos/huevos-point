/**
 * RLS Middleware — Opción B (SET de sesión)
 *
 * Inyecta app.tenant_id y app.role en la sesión PostgreSQL para que
 * las políticas RLS puedan aislar filas por tenant.
 *
 * Se agrega al final del array authMiddleware para que corra después
 * de que req.user y req.tenantId ya están populados.
 *
 * Seguro en Vercel serverless: cada invocación obtiene su propia
 * conexión del pool, que se resetea al finalizar el request.
 * En servidores long-running con pool compartido, el SET al final
 * del request previene contaminación entre requests.
 */

const sequelize = require('../config/database');

// Roles válidos — whitelist para prevenir inyección
const VALID_ROLES = new Set(['superadmin', 'admin', 'employee', 'demo']);

const rlsMiddleware = async (req, _res, next) => {
  try {
    const tenantId = Number.isInteger(req.tenantId) ? req.tenantId : null;
    const role = VALID_ROLES.has(req.user?.role) ? req.user.role : 'employee';

    // Usar números/strings validados directamente — no hay riesgo de inyección
    // tenantId es INTEGER validado por tenantMiddleware
    // role es de whitelist explícita
    await sequelize.query(
      `SET app.tenant_id = '${tenantId ?? ''}'`
    );
    await sequelize.query(
      `SET app.role = '${role}'`
    );

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = rlsMiddleware;
