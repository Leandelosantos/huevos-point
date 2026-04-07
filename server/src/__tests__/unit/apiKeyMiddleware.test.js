// Mocks ────────────────────────────────────────────────────────────────────
jest.mock('../../models', () => ({
  ApiKey: {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue([1]),
  },
}));

const { ApiKey } = require('../../models');
const {
  apiKeyMiddleware,
  requireScope,
  hashKey,
  _internal,
} = require('../../middlewares/apiKeyMiddleware');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mkReq = (headers = {}) => ({ headers });

const validKey = 'hp_live_abcdefghijklmnopqrstuvwxyz0123456789ABCD';
const validHash = hashKey(validKey);

beforeEach(() => {
  jest.clearAllMocks();
  _internal.cache.clear();
  _internal.rateBuckets.clear();
  _internal.lastUsedFlush.clear();
});

describe('apiKeyMiddleware', () => {
  describe('extracción de la clave', () => {
    it('rechaza request sin header', async () => {
      const next = jest.fn();
      await apiKeyMiddleware(mkReq(), mkRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('rechaza claves muy cortas', async () => {
      const next = jest.fn();
      await apiKeyMiddleware(mkReq({ 'x-api-key': 'short' }), mkRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('acepta el header Authorization: Bearer', async () => {
      ApiKey.findOne.mockResolvedValue({
        id: 1, isActive: true, expiresAt: null, rateLimitPerMin: 60,
        businessId: 1, tenantId: null, scopes: ['read:all'],
      });
      const next = jest.fn();
      const req = mkReq({ authorization: `Bearer ${validKey}` });
      await apiKeyMiddleware(req, mkRes(), next);
      expect(next).toHaveBeenCalledWith();
      expect(req.businessId).toBe(1);
      expect(req.apiScope).toBe('business');
    });

    it('acepta el header x-api-key', async () => {
      ApiKey.findOne.mockResolvedValue({
        id: 2, isActive: true, expiresAt: null, rateLimitPerMin: 60,
        businessId: null, tenantId: 5, scopes: ['read:sales'],
      });
      const next = jest.fn();
      const req = mkReq({ 'x-api-key': validKey });
      await apiKeyMiddleware(req, mkRes(), next);
      expect(next).toHaveBeenCalledWith();
      expect(req.tenantId).toBe(5);
      expect(req.apiScope).toBe('tenant');
    });
  });

  describe('estado de la clave', () => {
    it('clave inexistente → 401', async () => {
      ApiKey.findOne.mockResolvedValue(null);
      const next = jest.fn();
      await apiKeyMiddleware(mkReq({ 'x-api-key': validKey }), mkRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('clave inactiva → 401', async () => {
      ApiKey.findOne.mockResolvedValue({ id: 1, isActive: false, scopes: [], rateLimitPerMin: 60 });
      const next = jest.fn();
      await apiKeyMiddleware(mkReq({ 'x-api-key': validKey }), mkRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('clave expirada → 401', async () => {
      ApiKey.findOne.mockResolvedValue({
        id: 1, isActive: true, expiresAt: new Date(Date.now() - 1000),
        rateLimitPerMin: 60, scopes: ['read:all'], businessId: 1,
      });
      const next = jest.fn();
      await apiKeyMiddleware(mkReq({ 'x-api-key': validKey }), mkRes(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });
  });

  describe('rate limiting', () => {
    it('rechaza cuando se excede el límite por minuto', async () => {
      ApiKey.findOne.mockResolvedValue({
        id: 99, isActive: true, expiresAt: null, rateLimitPerMin: 2,
        businessId: 1, tenantId: null, scopes: ['read:all'],
      });

      const ok1 = jest.fn();
      const ok2 = jest.fn();
      const blocked = jest.fn();

      await apiKeyMiddleware(mkReq({ 'x-api-key': validKey }), mkRes(), ok1);
      await apiKeyMiddleware(mkReq({ 'x-api-key': validKey }), mkRes(), ok2);
      await apiKeyMiddleware(mkReq({ 'x-api-key': validKey }), mkRes(), blocked);

      expect(ok1).toHaveBeenCalledWith();
      expect(ok2).toHaveBeenCalledWith();
      expect(blocked).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429 }));
    });
  });

  describe('cache', () => {
    it('no consulta DB en la segunda llamada con la misma clave', async () => {
      ApiKey.findOne.mockResolvedValue({
        id: 1, isActive: true, expiresAt: null, rateLimitPerMin: 60,
        businessId: 1, tenantId: null, scopes: ['read:all'],
      });

      await apiKeyMiddleware(mkReq({ 'x-api-key': validKey }), mkRes(), jest.fn());
      await apiKeyMiddleware(mkReq({ 'x-api-key': validKey }), mkRes(), jest.fn());

      expect(ApiKey.findOne).toHaveBeenCalledTimes(1);
    });
  });
});

describe('requireScope', () => {
  it('read:all permite todos los scopes', () => {
    const next = jest.fn();
    requireScope('read:sales')({ apiScopes: ['read:all'] }, mkRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('scope específico permitido', () => {
    const next = jest.fn();
    requireScope('read:sales')({ apiScopes: ['read:sales'] }, mkRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('scope faltante → 403', () => {
    const next = jest.fn();
    requireScope('read:sales')({ apiScopes: ['read:products'] }, mkRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('scopes vacíos → 403', () => {
    const next = jest.fn();
    requireScope('read:sales')({ apiScopes: [] }, mkRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

describe('hashKey', () => {
  it('produce el mismo hash para la misma clave', () => {
    expect(hashKey('foo')).toBe(hashKey('foo'));
  });

  it('hashes distintas claves a valores distintos', () => {
    expect(hashKey('foo')).not.toBe(hashKey('bar'));
  });

  it('produce hash hex de 64 caracteres (sha-256)', () => {
    expect(hashKey('foo')).toMatch(/^[a-f0-9]{64}$/);
  });
});
