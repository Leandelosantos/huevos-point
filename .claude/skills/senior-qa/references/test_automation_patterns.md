# Patrones de Automatización de Tests — Huevos Point

## Setup Base — Jest (Backend)

```js
// server/jest.config.js (o en package.json bajo "jest")
{
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.test.js"],
    "clearMocks": true
  }
}
```

```js
// server/src/__tests__/setup.js — variables de entorno para tests
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
```

---

## Mocks de Sequelize

### Mock de modelo con jest.mock

```js
// Patrón base — mockear solo lo que el test necesita
jest.mock('../../models', () => ({
  Sale: { create: jest.fn(), findAll: jest.fn(), sum: jest.fn() },
  SaleItem: { bulkCreate: jest.fn() },
  Product: { findOne: jest.fn(), update: jest.fn() },
  Expense: { sum: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));
```

### Mock de transacción con commit/rollback

```js
const mockT = { commit: jest.fn(), rollback: jest.fn() };
sequelize.transaction.mockResolvedValue(mockT);

// Test de rollback ante error
Product.update.mockRejectedValue(new Error('DB error'));
await expect(salesService.createSale(data)).rejects.toThrow();
expect(mockT.rollback).toHaveBeenCalled();
expect(mockT.commit).not.toHaveBeenCalled();
```

### Verificar parámetros del where

```js
// No mockear Op — verificar con expect.objectContaining
expect(Sale.sum).toHaveBeenCalledWith('totalAmount', expect.objectContaining({
  where: expect.objectContaining({ tenantId: 1 }),
}));
```

---

## Mocks de JWT y Auth

### Generar token de test

```js
const jwt = require('jsonwebtoken');

const makeToken = (overrides = {}) => jwt.sign(
  { id: 1, username: 'testuser', role: 'admin', tenants: [1], ...overrides },
  'test-secret',
  { expiresIn: '1h' }
);
```

### Token por rol para integration tests

```js
const adminToken  = makeToken({ role: 'admin' });
const employeeToken = makeToken({ role: 'employee' });
const superadminToken = makeToken({ role: 'superadmin', tenants: [1, 2] });
```

### Mock del authMiddleware para controller unit tests

```js
jest.mock('../../middlewares/authMiddleware', () => (req, res, next) => {
  req.user = { id: 1, role: 'admin' };
  req.tenantId = 1;
  next();
});
```

---

## Patrones de Tests Unitarios — Services

### sales.service — createSale

```js
describe('salesService.createSale', () => {
  beforeEach(() => jest.clearAllMocks());

  it('descuenta stock correctamente', async () => {
    const product = { id: 1, stockQuantity: 10, tenantId: 1, update: jest.fn() };
    Product.findOne.mockResolvedValue(product);
    Sale.create.mockResolvedValue({ id: 1 });
    SaleItem.bulkCreate.mockResolvedValue([]);

    await salesService.createSale({
      tenantId: 1, userId: 1,
      items: [{ productId: 1, quantity: 2, discount: 0 }],
    });

    expect(product.update).toHaveBeenCalledWith(
      { stockQuantity: 8 }, { transaction: mockT }
    );
  });

  it('calcula totalAmount con descuento: precio=100, qty=2, desc=10% → 180', async () => {
    const product = { id: 1, stockQuantity: 10, tenantId: 1, unitPrice: 100, update: jest.fn() };
    Product.findOne.mockResolvedValue(product);
    Sale.create.mockResolvedValue({ id: 1 });
    SaleItem.bulkCreate.mockResolvedValue([]);

    await salesService.createSale({
      tenantId: 1, userId: 1,
      items: [{ productId: 1, quantity: 2, discount: 10 }],
    });

    expect(Sale.create).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 180 }),
      expect.anything()
    );
  });

  it('lanza AppError 400 si stock insuficiente', async () => {
    Product.findOne.mockResolvedValue({ id: 1, stockQuantity: 1, tenantId: 1 });

    await expect(salesService.createSale({
      tenantId: 1, userId: 1,
      items: [{ productId: 1, quantity: 5, discount: 0 }],
    })).rejects.toMatchObject({ statusCode: 400 });

    expect(mockT.rollback).toHaveBeenCalled();
  });

  it('lanza AppError 404 si producto es de otro tenant', async () => {
    Product.findOne.mockResolvedValue(null); // tenantId en where → no encontrado

    await expect(salesService.createSale({
      tenantId: 1, userId: 1,
      items: [{ productId: 99, quantity: 1, discount: 0 }],
    })).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

### dashboard.service — getDailySummary

```js
describe('dashboardService.getDailySummary', () => {
  it('netBalance = totalIncome - totalExpenses', async () => {
    Sale.sum.mockResolvedValue(1000);
    Expense.sum.mockResolvedValue(300);

    const result = await dashboardService.getDailySummary(1, '2026-03-17');
    expect(result.netBalance).toBe(700);
  });

  it('sin datos → ceros', async () => {
    Sale.sum.mockResolvedValue(null);
    Expense.sum.mockResolvedValue(null);

    const result = await dashboardService.getDailySummary(1, '2026-03-17');
    expect(result).toMatchObject({ totalIncome: 0, totalExpenses: 0, netBalance: 0 });
  });

  it('filtra por tenantId', async () => {
    await dashboardService.getDailySummary(2, '2026-03-17');
    expect(Sale.sum).toHaveBeenCalledWith(
      'totalAmount', expect.objectContaining({ where: expect.objectContaining({ tenantId: 2 }) })
    );
  });
});
```

---

## Patrones de Tests de Middleware

### authMiddleware — unit test

```js
const mockReq = (token) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authMiddleware', () => {
  it('token válido → next()', () => {
    const next = jest.fn();
    const token = jwt.sign({ id: 1 }, 'test-secret');
    authMiddleware(mockReq(token), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('sin token → 401', () => {
    const res = mockRes();
    authMiddleware(mockReq(null), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('token expirado → 401', () => {
    const token = jwt.sign({ id: 1 }, 'test-secret', { expiresIn: '-1s' });
    const res = mockRes();
    authMiddleware(mockReq(token), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

### validationMiddleware — helper de test

```js
// Ejecutar todos los validators de express-validator en cadena
const runValidators = async (validators, body) => {
  const req = { body };
  for (const validator of validators) {
    await validator(req, {}, () => {});
  }
  return validationResult(req);
};

// Uso:
const errors = await runValidators(validateSale, { items: [] });
expect(errors.isEmpty()).toBe(false);
```

---

## Patrones de Integration Tests — Supertest

```js
const request = require('supertest');
const app = require('../app');

describe('POST /api/auth/login', () => {
  it('credenciales correctas → 200 con token', async () => {
    jest.spyOn(authService, 'login').mockResolvedValue({
      token: 'jwt.token.here', user: { id: 1, role: 'admin' },
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '1234' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('password incorrecta → 401', async () => {
    jest.spyOn(authService, 'login').mockRejectedValue(
      Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 })
    );
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('Seguridad — rutas protegidas', () => {
  it('GET /api/sales sin token → 401', async () => {
    const res = await request(app).get('/api/sales');
    expect(res.status).toBe(401);
  });

  it('rate limit login: 11 intentos → último es 429', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').send({ username: 'x', password: 'x' });
    }
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'x', password: 'x' });
    expect(res.status).toBe(429);
  });
});
```

---

## Setup de Vitest (Frontend)

```js
// client/vite.config.js — sección test
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/__tests__/setup.js',
}

// client/src/__tests__/setup.js
import '@testing-library/jest-dom';
```

### Test de formatters.js

```js
import { CURRENCY_FORMAT } from '../utils/formatters';

describe('CURRENCY_FORMAT', () => {
  it('1000 → $1.000,00', () => {
    expect(CURRENCY_FORMAT.format(1000)).toMatch(/1\.000,00/);
  });
  it('0 → $0,00', () => {
    expect(CURRENCY_FORMAT.format(0)).toMatch(/0,00/);
  });
  it('1234.5 → $1.234,50', () => {
    expect(CURRENCY_FORMAT.format(1234.5)).toMatch(/1\.234,50/);
  });
  it('negativo muestra signo', () => {
    expect(CURRENCY_FORMAT.format(-500)).toMatch(/-/);
  });
});
```

---

## Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
set -e

echo "[pre-commit] Building client..."
cd client && npm run build --silent && cd ..

echo "[pre-commit] Running server tests..."
cd server && npm test --silent && cd ..

echo "[pre-commit] Running client tests..."
cd client && npm test -- --run --silent && cd ..

echo "[pre-commit] All checks passed."
```

```bash
# Instalar y verificar
chmod +x .git/hooks/pre-commit
bash .git/hooks/pre-commit  # test manual
```