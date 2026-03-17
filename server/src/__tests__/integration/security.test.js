const request = require('supertest');
const jwt = require('jsonwebtoken');

// ── Mocks (deben declararse antes del require del app) ────────────────────────

// Evitar conexión real a PostgreSQL en tests
jest.mock('../../config/database', () => ({
  transaction: jest.fn(),
  query: jest.fn(),
  authenticate: jest.fn().mockResolvedValue(true),
  define: jest.fn(),
  QueryTypes: { SELECT: 'SELECT' },
}));

jest.mock('../../models', () => ({
  Sale: { findAll: jest.fn(), sum: jest.fn(), create: jest.fn() },
  SaleItem: { bulkCreate: jest.fn() },
  Expense: { findAll: jest.fn(), sum: jest.fn(), create: jest.fn() },
  Product: { findAll: jest.fn(), findOne: jest.fn() },
  Purchase: { findAll: jest.fn() },
  User: { findByPk: jest.fn(), findOne: jest.fn() },
  Tenant: { findAll: jest.fn() },
  AuditLog: { findAndCountAll: jest.fn(), create: jest.fn() },
}));

// tenantMiddleware hace query a DB → mockeamos para que solo extraiga el header
jest.mock('../../middlewares/tenantMiddleware', () => (req, _res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  req.tenantId = tenantId ? parseInt(tenantId, 10) : null;
  next();
});

// ── App ───────────────────────────────────────────────────────────────────────

const app = require('../../app');

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeToken = (payload = {}) =>
  jwt.sign(
    { id: 1, username: 'testuser', role: 'admin', tenants: [{ id: 1 }], ...payload },
    'test-secret-jest-only',
    { expiresIn: '1h' }
  );

const adminToken = makeToken({ role: 'admin' });
const employeeToken = makeToken({ role: 'employee' });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Seguridad — endpoints protegidos', () => {
  describe('sin token de autenticación → 401', () => {
    const protectedRoutes = [
      ['GET', '/api/sales'],
      ['GET', '/api/expenses'],
      ['GET', '/api/products'],
      ['GET', '/api/dashboard/summary'],
      ['GET', '/api/metrics/monthly-balance'],
      ['GET', '/api/purchases'],
      ['GET', '/api/audit-logs'],
    ];

    test.each(protectedRoutes)('%s %s sin token → 401', async (method, route) => {
      const res = await request(app)[method.toLowerCase()](route);
      expect(res.status).toBe(401);
    });
  });

  describe('con token inválido → 401', () => {
    it('token con firma incorrecta → 401', async () => {
      const badToken = jwt.sign({ id: 1 }, 'wrong-secret');
      const res = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${badToken}`);
      expect(res.status).toBe(401);
    });

    it('token expirado → 401', async () => {
      const expiredToken = jwt.sign({ id: 1 }, 'test-secret-jest-only', { expiresIn: '-1s' });
      const res = await request(app)
        .get('/api/sales')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('control de roles', () => {
    it('employee en ruta de admin → 403', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-tenant-id', '1');
      expect(res.status).toBe(403);
    });

    it('admin en ruta de admin → no 403', async () => {
      // AuditLog.findAndCountAll necesita un mock que resuelva
      const { AuditLog } = require('../../models');
      AuditLog.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', '1');
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });

  describe('validación de login', () => {
    it('POST /api/auth/login sin body → 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login con username vacío → 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'pass' });
      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login con password vacía → 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('health check', () => {
    it('GET /api/health → 200 sin autenticación', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
