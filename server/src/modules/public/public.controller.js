const service = require('./public.service');

/**
 * Builds the API key context (businessId/tenantId) from the request.
 * Populated upstream by `apiKeyMiddleware`.
 */
const ctx = (req) => ({ businessId: req.businessId, tenantId: req.tenantId });

const ok = (res, payload) => res.json({ success: true, ...payload });

const listTenants = async (req, res, next) => {
  try {
    const result = await service.listTenants(ctx(req), req.query);
    return ok(res, result);
  } catch (e) { next(e); }
};

const listProducts = async (req, res, next) => {
  try {
    const result = await service.listProducts(ctx(req), req.query);
    return ok(res, result);
  } catch (e) { next(e); }
};

const listSales = async (req, res, next) => {
  try {
    const result = await service.listSales(ctx(req), req.query);
    return ok(res, result);
  } catch (e) { next(e); }
};

const listExpenses = async (req, res, next) => {
  try {
    const result = await service.listExpenses(ctx(req), req.query);
    return ok(res, result);
  } catch (e) { next(e); }
};

const listPurchases = async (req, res, next) => {
  try {
    const result = await service.listPurchases(ctx(req), req.query);
    return ok(res, result);
  } catch (e) { next(e); }
};

const getMetrics = async (req, res, next) => {
  try {
    const data = await service.getMetrics(ctx(req), req.query);
    return ok(res, { data });
  } catch (e) { next(e); }
};

const ping = (_req, res) => {
  res.json({ success: true, data: { status: 'ok', api: 'public/v1', timestamp: new Date().toISOString() } });
};

module.exports = {
  listTenants,
  listProducts,
  listSales,
  listExpenses,
  listPurchases,
  getMetrics,
  ping,
};
