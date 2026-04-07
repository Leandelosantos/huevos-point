const crypto = require('crypto');
const { ApiKey } = require('../models');
const AppError = require('../utils/AppError');

/**
 * Hashes a raw API key with SHA-256.
 * Stored in DB as hex digest — never store the raw key.
 */
const hashKey = (rawKey) => crypto.createHash('sha256').update(rawKey).digest('hex');

/**
 * In-memory cache for the lookup of validated keys to avoid hitting the DB
 * on every request. Key: hash. Value: { apiKey, expiresAt (cache TTL) }.
 * TTL is short (60s) so revocations propagate quickly across serverless instances.
 */
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;

const cacheGet = (hash) => {
  const entry = cache.get(hash);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(hash);
    return null;
  }
  return entry.apiKey;
};

const cacheSet = (hash, apiKey) => {
  cache.set(hash, { apiKey, expiresAt: Date.now() + CACHE_TTL_MS });
};

/**
 * Sliding-window in-memory rate limiter per API key.
 * Map: apiKeyId -> array of request timestamps (ms).
 * Old entries are pruned on each check.
 */
const rateBuckets = new Map();
const RATE_WINDOW_MS = 60 * 1000;

/**
 * Throttle for `last_used_at` writes — at most once per minute per key.
 * Avoids write amplification on high-traffic keys.
 */
const lastUsedFlush = new Map();
const LAST_USED_THROTTLE_MS = 60 * 1000;
const shouldFlushLastUsed = (apiKeyId) => {
  const last = lastUsedFlush.get(apiKeyId) || 0;
  const now = Date.now();
  if (now - last < LAST_USED_THROTTLE_MS) return false;
  lastUsedFlush.set(apiKeyId, now);
  return true;
};

const checkRateLimit = (apiKeyId, limit) => {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  let bucket = rateBuckets.get(apiKeyId) || [];
  bucket = bucket.filter((ts) => ts > windowStart);
  if (bucket.length >= limit) {
    rateBuckets.set(apiKeyId, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(apiKeyId, bucket);
  return true;
};

/**
 * API key authentication middleware.
 *
 * Reads the key from `Authorization: Bearer <key>` or `x-api-key` header,
 * validates it against the hashed value in DB, enforces expiration,
 * active flag and per-key rate limiting. Populates:
 *   - req.apiKey      → ApiKey instance
 *   - req.apiScope    → 'business' | 'tenant'
 *   - req.businessId  → number | null
 *   - req.tenantId    → number | null (only if scoped to a single tenant)
 */
const apiKeyMiddleware = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const rawKey = bearer || req.headers['x-api-key'] || null;

    if (!rawKey || typeof rawKey !== 'string' || rawKey.length < 20) {
      throw new AppError('API key requerida', 401);
    }

    const hash = hashKey(rawKey);
    let apiKey = cacheGet(hash);

    if (!apiKey) {
      apiKey = await ApiKey.findOne({ where: { keyHash: hash } });
      if (!apiKey) throw new AppError('API key inválida', 401);
      cacheSet(hash, apiKey);
    }

    if (!apiKey.isActive) throw new AppError('API key desactivada', 401);
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      throw new AppError('API key expirada', 401);
    }

    if (!checkRateLimit(apiKey.id, apiKey.rateLimitPerMin)) {
      throw new AppError('Rate limit excedido para esta API key', 429);
    }

    // Update last_used_at asynchronously, throttled to once per minute per key
    if (shouldFlushLastUsed(apiKey.id)) {
      ApiKey.update({ lastUsedAt: new Date() }, { where: { id: apiKey.id } }).catch(
        (e) => console.warn('[apiKeyMiddleware] no se pudo actualizar last_used_at:', e.message)
      );
    }

    req.apiKey = apiKey;
    req.apiScope = apiKey.tenantId ? 'tenant' : 'business';
    req.businessId = apiKey.businessId || null;
    req.tenantId = apiKey.tenantId || null;
    req.apiScopes = apiKey.scopes || [];

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Scope guard: requires the request's API key to include at least one of
 * the listed scopes. Use after `apiKeyMiddleware`.
 *
 * Built-in scopes:
 *   - read:all          → wildcard, allows every read endpoint
 *   - read:tenants
 *   - read:products
 *   - read:sales
 *   - read:expenses
 *   - read:purchases
 *   - read:metrics
 */
const requireScope = (...required) => (req, _res, next) => {
  const granted = req.apiScopes || [];
  if (granted.includes('read:all')) return next();
  if (required.some((r) => granted.includes(r))) return next();
  return next(new AppError(`API key sin permisos: requiere ${required.join(' o ')}`, 403));
};

module.exports = {
  apiKeyMiddleware,
  requireScope,
  hashKey,
  // exported for testing
  _internal: { cache, rateBuckets, checkRateLimit, lastUsedFlush },
};
