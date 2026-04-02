const { SuperadminAuditLog } = require('../models');

function requireSuperadmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado' });
  }
  next();
}

async function superadminAudit(req, res, next) {
  const targetTenant = req.params.tenantId || req.query.tenantId;
  if (targetTenant) {
    try {
      await SuperadminAuditLog.create({
        adminUserId: req.user.id,
        action: `${req.method} ${req.originalUrl}`,
        targetTenant: parseInt(targetTenant),
        details: { query: req.query, params: req.params, body: req.body },
        ipAddress: req.ip,
      });
    } catch (err) {
      // Non-blocking: log but don't fail request
      console.error('SuperadminAuditLog error:', err.message);
    }
  }
  next();
}

module.exports = { requireSuperadmin, superadminAudit };