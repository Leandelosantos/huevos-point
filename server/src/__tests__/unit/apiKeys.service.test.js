jest.mock('../../models', () => ({
  ApiKey: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
}));

const { ApiKey } = require('../../models');
const apiKeysService = require('../../modules/apiKeys/apiKeys.service');
const { hashKey } = require('../../middlewares/apiKeyMiddleware');

beforeEach(() => jest.clearAllMocks());

describe('apiKeysService.createApiKey', () => {
  it('rechaza nombre vacío', async () => {
    await expect(apiKeysService.createApiKey({ name: '', businessId: 1, scopes: ['read:all'] }))
      .rejects.toThrow(/nombre/);
  });

  it('rechaza si no se especifica businessId ni tenantId', async () => {
    await expect(apiKeysService.createApiKey({ name: 'k', scopes: ['read:all'] }))
      .rejects.toThrow(/businessId o tenantId/);
  });

  it('rechaza si se especifican ambos', async () => {
    await expect(apiKeysService.createApiKey({ name: 'k', businessId: 1, tenantId: 1, scopes: ['read:all'] }))
      .rejects.toThrow(/al mismo tiempo/);
  });

  it('rechaza scopes inválidos', async () => {
    await expect(apiKeysService.createApiKey({ name: 'k', businessId: 1, scopes: ['write:all'] }))
      .rejects.toThrow(/inválidos/);
  });

  it('rechaza scopes vacíos', async () => {
    await expect(apiKeysService.createApiKey({ name: 'k', businessId: 1, scopes: [] }))
      .rejects.toThrow(/al menos un scope/);
  });

  it('crea una clave válida y devuelve el rawKey con prefijo hp_live_', async () => {
    ApiKey.create.mockImplementation((data) => Promise.resolve({
      id: 1, ...data, createdAt: new Date(),
    }));

    const result = await apiKeysService.createApiKey({
      name: 'Satellite ERP',
      businessId: 1,
      scopes: ['read:sales', 'read:products'],
    });

    expect(result.rawKey).toMatch(/^hp_live_/);
    expect(result.rawKey.length).toBeGreaterThan(20);
    expect(result.scopes).toEqual(['read:sales', 'read:products']);
    expect(result.businessId).toBe(1);
    expect(result.tenantId).toBeNull();

    // El hash almacenado debe coincidir con el hash del rawKey devuelto
    const passedToCreate = ApiKey.create.mock.calls[0][0];
    expect(passedToCreate.keyHash).toBe(hashKey(result.rawKey));
    expect(passedToCreate.keyPrefix).toBe(result.rawKey.slice(0, 12));
  });

  it('cada llamada produce una clave única', async () => {
    ApiKey.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data, createdAt: new Date() }));
    const a = await apiKeysService.createApiKey({ name: 'a', businessId: 1, scopes: ['read:all'] });
    const b = await apiKeysService.createApiKey({ name: 'b', businessId: 1, scopes: ['read:all'] });
    expect(a.rawKey).not.toBe(b.rawKey);
  });
});

describe('apiKeysService.revokeApiKey', () => {
  it('marca la clave como inactiva', async () => {
    const fake = { id: 1, isActive: true, save: jest.fn().mockResolvedValue() };
    ApiKey.findByPk.mockResolvedValue(fake);

    const result = await apiKeysService.revokeApiKey(1);
    expect(fake.isActive).toBe(false);
    expect(fake.save).toHaveBeenCalled();
    expect(result.isActive).toBe(false);
  });

  it('lanza 404 si la clave no existe', async () => {
    ApiKey.findByPk.mockResolvedValue(null);
    await expect(apiKeysService.revokeApiKey(999)).rejects.toThrow(/no encontrada/);
  });
});

describe('apiKeysService.listApiKeys', () => {
  it('excluye keyHash del resultado', async () => {
    ApiKey.findAll.mockResolvedValue([]);
    await apiKeysService.listApiKeys();
    expect(ApiKey.findAll).toHaveBeenCalledWith(expect.objectContaining({
      attributes: { exclude: ['keyHash'] },
    }));
  });
});
