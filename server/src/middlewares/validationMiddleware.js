const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/** Runs validation result check and throws AppError on failure */
const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('. ');
    return next(new AppError(messages, 400));
  }
  next();
};

const validateLogin = [
  body('username').trim().notEmpty().withMessage('El usuario es obligatorio'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
  handleValidationErrors,
];

const validateSale = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un producto en la venta'),
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('ID de producto inválido'),
  body('items.*.quantity')
    .isFloat({ gt: 0 })
    .withMessage('La cantidad debe ser mayor a 0'),
  body('items.*.discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('El descuento debe estar entre 0 y 100'),
  handleValidationErrors,
];

const validateExpense = [
  body('concept')
    .trim()
    .notEmpty()
    .withMessage('El concepto es obligatorio'),
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('El monto debe ser un número positivo'),
  handleValidationErrors,
];

const validateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del producto es obligatorio'),
  body('stockQuantity')
    .isFloat({ min: 0 })
    .withMessage('La cantidad debe ser un número no negativo'),
  body('unitPrice')
    .isFloat({ gt: 0 })
    .withMessage('El precio debe ser un número positivo'),
  handleValidationErrors,
];

module.exports = {
  validateLogin,
  validateSale,
  validateExpense,
  validateProduct,
  handleValidationErrors,
};
