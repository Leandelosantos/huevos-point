const { Subscription, SubscriptionPlan, Tenant } = require('../models');

/**
 * Verifica que el tenant activo tenga suscripción activa.
 * Carga req.planFeatures y req.planLimits para uso en requireFeature().
 * Bypass para superadmin.
 */
const subscriptionCheck = async (req, res, next) => {
  try {
    // Bypass para superadmin
    if (req.user && req.user.role === 'superadmin') {
      return next();
    }

    const tenantId = req.tenantId;
    if (!tenantId) return next(); // sin tenant => otro middleware ya lo rechazará

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['id', 'subscriptionStatus'] });
    if (!tenant) return next();

    const status = tenant.subscriptionStatus;

    if (status !== 'active') {
      return res.status(402).json({
        success: false,
        message: 'Tu suscripción no está activa. Por favor activá o renovás tu plan para continuar.',
        subscriptionStatus: status,
      });
    }

    // Cargar features y limits del plan activo
    const subscription = await Subscription.findOne({
      where: { tenantId, status: 'active' },
      include: [{ model: SubscriptionPlan, as: 'plan' }],
    });

    if (subscription && subscription.plan) {
      req.planFeatures = subscription.plan.features || {};
      req.planLimits = {
        maxBranches: subscription.plan.maxBranches,
        maxUsers: subscription.plan.maxUsers,
      };
    } else {
      req.planFeatures = {};
      req.planLimits = {};
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = subscriptionCheck;
