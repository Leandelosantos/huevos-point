/**
 * Middleware de fábrica: verifica que el plan activo del tenant incluya una feature.
 * Usar después de subscriptionCheck (requiere req.planFeatures).
 * Bypass para superadmin.
 *
 * Uso: router.get('/ruta', requireFeature('auditoria'), handler)
 */
const requireFeature = (featureName) => (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') return next();

  const features = req.planFeatures || {};
  if (!features[featureName]) {
    return res.status(403).json({
      success: false,
      message: `Tu plan no incluye acceso a esta funcionalidad (${featureName}). Actualizá tu plan para habilitarla.`,
      requiredFeature: featureName,
    });
  }

  next();
};

module.exports = requireFeature;
