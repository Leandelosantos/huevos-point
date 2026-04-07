const crypto = require('crypto');
const { ApiKey } = require('../../models');
const { hashKey } = require('../../middlewares/apiKeyMiddleware');
const AppError = require('../../utils/AppError');

const VALID_SCOPES = [
  'read:all',
  'read:tenants',
  'read:products',
  'read:sales',
  'read:expenses',
  'read:purchases',
  'read:metrics',
];

const PREFIX = 'hp_live_';

/**
 * Generates a fresh API key. The raw key is shown to the caller exactly once;
 * only the SHA-256 hash and a short prefix are stored.
 */
const generateRawKey = () => {
  const random = crypto.randomBytes(32).toString('base64url');
  return `${PREFIX}${random}`;
};

const validateScopes = (scopes) => {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new AppError('Debe especificar al menos un scope', 400);
  }
  const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
  if (invalid.length > 0) {
    throw new AppError(`Scopes inválidos: ${invalid.join(', ')}`, 400);
  }
};

const createApiKey = async ({ name, businessId, tenantId, scopes, rateLimitPerMin, expiresAt, createdBy }) => {
  if (!name || !name.trim()) throw new AppError('El nombre es requerido', 400);
  if (!businessId && !tenantId) {
    throw new AppError('Debe especificar businessId o tenantId', 400);
  }
  if (businessId && tenantId) {
    throw new AppError('No se permite especificar businessId y tenantId al mismo tiempo', 400);
  }
  validateScopes(scopes);

  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const created = await ApiKey.create({
    name: name.trim(),
    keyPrefix,
    keyHash,
    businessId: businessId || null,
    tenantId: tenantId || null,
    scopes,
    rateLimitPerMin: rateLimitPerMin || 60,
    expiresAt: expiresAt || null,
    createdBy: createdBy || null,
    isActive: true,
  });

  // Returned ONCE with the raw key. After this it cannot be retrieved.
  return {
    id: created.id,
    name: created.name,
    keyPrefix: created.keyPrefix,
    rawKey,
    businessId: created.businessId,
    tenantId: created.tenantId,
    scopes: created.scopes,
    rateLimitPerMin: created.rateLimitPerMin,
    expiresAt: created.expiresAt,
    createdAt: created.createdAt,
  };
};

const listApiKeys = async () => {
  const keys = await ApiKey.findAll({
    attributes: { exclude: ['keyHash'] },
    order: [['createdAt', 'DESC']],
  });
  return keys;
};

const revokeApiKey = async (id) => {
  const key = await ApiKey.findByPk(id);
  if (!key) throw new AppError('API key no encontrada', 404);
  key.isActive = false;
  await key.save();
  return key;
};

module.exports = { createApiKey, listApiKeys, revokeApiKey, VALID_SCOPES };
