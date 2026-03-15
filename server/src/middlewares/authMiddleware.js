const jwt = require('jsonwebtoken');
const env = require('../config/environment');
const AppError = require('../utils/AppError');

const jwtVerify = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticación no proporcionado', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return next(new AppError('Token inválido o expirado', 401));
  }
};

const tenantMiddleware = require('./tenantMiddleware');

module.exports = [jwtVerify, tenantMiddleware];
