const { validationResult } = require('express-validator');
const {
  validateSale,
  validateExpense,
  validateProduct,
  validatePurchase,
  validateLogin,
} = require('../../middlewares/validationMiddleware');

// ── Helper ────────────────────────────────────────────────────────────────────
// Corre todos los validators de campo (excluye handleValidationErrors al final)
const runValidators = async (validators, body) => {
  const req = { body };
  const fieldValidators = validators.slice(0, -1);
  for (const validator of fieldValidators) {
    await validator(req, {}, () => {});
  }
  return validationResult(req);
};

// ── validateSale ──────────────────────────────────────────────────────────────

describe('validateSale', () => {
  it('datos válidos → sin errores', async () => {
    const errors = await runValidators(validateSale, {
      items: [{ productId: 1, quantity: 2, discount: 10 }],
    });
    expect(errors.isEmpty()).toBe(true);
  });

  it('items vacío → error 400', async () => {
    const errors = await runValidators(validateSale, { items: [] });
    expect(errors.isEmpty()).toBe(false);
  });

  it('items ausente → error', async () => {
    const errors = await runValidators(validateSale, {});
    expect(errors.isEmpty()).toBe(false);
  });

  it('quantity = 0 → error', async () => {
    const errors = await runValidators(validateSale, {
      items: [{ productId: 1, quantity: 0, discount: 0 }],
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('quantity negativa → error', async () => {
    const errors = await runValidators(validateSale, {
      items: [{ productId: 1, quantity: -1, discount: 0 }],
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('discount < 0 → error', async () => {
    const errors = await runValidators(validateSale, {
      items: [{ productId: 1, quantity: 1, discount: -5 }],
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('discount > 100 → error', async () => {
    const errors = await runValidators(validateSale, {
      items: [{ productId: 1, quantity: 1, discount: 150 }],
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('discount = 0 → válido', async () => {
    const errors = await runValidators(validateSale, {
      items: [{ productId: 1, quantity: 1, discount: 0 }],
    });
    expect(errors.isEmpty()).toBe(true);
  });

  it('discount = 100 → válido', async () => {
    const errors = await runValidators(validateSale, {
      items: [{ productId: 1, quantity: 1, discount: 100 }],
    });
    expect(errors.isEmpty()).toBe(true);
  });

  it('productId inválido (string) → error', async () => {
    const errors = await runValidators(validateSale, {
      items: [{ productId: 'abc', quantity: 1, discount: 0 }],
    });
    expect(errors.isEmpty()).toBe(false);
  });
});

// ── validateExpense ───────────────────────────────────────────────────────────

describe('validateExpense', () => {
  it('datos válidos → sin errores', async () => {
    const errors = await runValidators(validateExpense, { concept: 'Luz', amount: 500 });
    expect(errors.isEmpty()).toBe(true);
  });

  it('concept vacío → error', async () => {
    const errors = await runValidators(validateExpense, { concept: '', amount: 500 });
    expect(errors.isEmpty()).toBe(false);
  });

  it('amount = 0 → error', async () => {
    const errors = await runValidators(validateExpense, { concept: 'Luz', amount: 0 });
    expect(errors.isEmpty()).toBe(false);
  });

  it('amount negativo → error', async () => {
    const errors = await runValidators(validateExpense, { concept: 'Luz', amount: -100 });
    expect(errors.isEmpty()).toBe(false);
  });
});

// ── validateProduct ───────────────────────────────────────────────────────────

describe('validateProduct', () => {
  it('datos válidos → sin errores', async () => {
    const errors = await runValidators(validateProduct, {
      name: 'Huevo', stockQuantity: 100, unitPrice: 50,
    });
    expect(errors.isEmpty()).toBe(true);
  });

  it('name vacío → error', async () => {
    const errors = await runValidators(validateProduct, {
      name: '', stockQuantity: 100, unitPrice: 50,
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('unitPrice = 0 → error', async () => {
    const errors = await runValidators(validateProduct, {
      name: 'Huevo', stockQuantity: 0, unitPrice: 0,
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('stockQuantity negativo → error', async () => {
    const errors = await runValidators(validateProduct, {
      name: 'Huevo', stockQuantity: -5, unitPrice: 50,
    });
    expect(errors.isEmpty()).toBe(false);
  });
});

// ── validatePurchase ──────────────────────────────────────────────────────────

describe('validatePurchase', () => {
  it('datos válidos → sin errores', async () => {
    const errors = await runValidators(validatePurchase, {
      productId: 1, quantity: 10, cost: 40, price: 60,
    });
    expect(errors.isEmpty()).toBe(true);
  });

  it('quantity = 0 → error', async () => {
    const errors = await runValidators(validatePurchase, {
      productId: 1, quantity: 0, cost: 40, price: 60,
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('quantity negativa → error', async () => {
    const errors = await runValidators(validatePurchase, {
      productId: 1, quantity: -1, cost: 40, price: 60,
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('price = 0 → error', async () => {
    const errors = await runValidators(validatePurchase, {
      productId: 1, quantity: 5, cost: 40, price: 0,
    });
    expect(errors.isEmpty()).toBe(false);
  });

  it('productId inválido → error', async () => {
    const errors = await runValidators(validatePurchase, {
      productId: 'abc', quantity: 5, cost: 40, price: 60,
    });
    expect(errors.isEmpty()).toBe(false);
  });
});

// ── validateLogin ─────────────────────────────────────────────────────────────

describe('validateLogin', () => {
  it('datos válidos → sin errores', async () => {
    const errors = await runValidators(validateLogin, { username: 'admin', password: '1234' });
    expect(errors.isEmpty()).toBe(true);
  });

  it('username vacío → error', async () => {
    const errors = await runValidators(validateLogin, { username: '', password: '1234' });
    expect(errors.isEmpty()).toBe(false);
  });

  it('password vacía → error', async () => {
    const errors = await runValidators(validateLogin, { username: 'admin', password: '' });
    expect(errors.isEmpty()).toBe(false);
  });
});
