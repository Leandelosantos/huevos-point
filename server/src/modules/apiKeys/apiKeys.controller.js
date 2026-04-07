const apiKeysService = require('./apiKeys.service');

const create = async (req, res, next) => {
  try {
    const { name, businessId, tenantId, scopes, rateLimitPerMin, expiresAt } = req.body;
    const result = await apiKeysService.createApiKey({
      name,
      businessId,
      tenantId,
      scopes,
      rateLimitPerMin,
      expiresAt,
      createdBy: req.user?.id,
    });
    res.status(201).json({
      success: true,
      data: result,
      message: 'API key creada. Guardá rawKey en un lugar seguro: no podrá volver a verse.',
    });
  } catch (error) {
    next(error);
  }
};

const list = async (_req, res, next) => {
  try {
    const keys = await apiKeysService.listApiKeys();
    res.json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
};

const revoke = async (req, res, next) => {
  try {
    const key = await apiKeysService.revokeApiKey(req.params.id);
    res.json({ success: true, data: key, message: 'API key revocada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, list, revoke };
