const env = require('../config/environment');

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log all errors for debugging (visible in Vercel Function Logs)
  console.error('[ERROR]', err.message, err.stack);

  const response = {
    success: false,
    message: isOperational ? err.message : 'Error interno del servidor',
  };

  if (env.NODE_ENV === 'development') {
    response.error = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorMiddleware;
