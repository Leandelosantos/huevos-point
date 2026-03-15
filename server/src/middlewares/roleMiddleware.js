const AppError = require('../utils/AppError');

/**
 * Factory function that returns middleware to check if user has the required role.
 * @param  {...string} allowedRoles - Roles allowed to access the route
 */
const requireRole = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('No autenticado', 401));
    }

    if (req.user.role === 'superadmin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('No tiene permisos para acceder a este recurso', 403));
    }

    next();
  };
};

module.exports = { requireRole };
