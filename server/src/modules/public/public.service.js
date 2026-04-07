const repo = require('./public.repository');
const AppError = require('../../utils/AppError');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

/**
 * Normalises pagination params from a query object.
 * - limit: 1..100, default 25
 * - offset: >=0, default 0
 */
const parsePagination = (query = {}) => {
  let limit = parseInt(query.limit, 10);
  let offset = parseInt(query.offset, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  return { limit, offset };
};

/**
 * Validates an ISO date (YYYY-MM-DD). Returns the string or throws AppError.
 */
const parseDate = (value, field) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`Parámetro ${field} inválido (formato esperado: YYYY-MM-DD)`, 400);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new AppError(`Parámetro ${field} inválido`, 400);
  }
  return value;
};

const parseDateRange = (query) => {
  const from = parseDate(query.from, 'from');
  const to = parseDate(query.to, 'to');
  if (from && to && from > to) {
    throw new AppError('El parámetro "from" debe ser menor o igual a "to"', 400);
  }
  return { from, to };
};

const buildMeta = ({ count, limit, offset }) => ({
  total: count,
  limit,
  offset,
  hasMore: offset + limit < count,
});

const listTenants = async (ctx, query) => {
  const { limit, offset } = parsePagination(query);
  const { count, rows } = await repo.findTenants({ ...ctx, limit, offset });
  return { data: rows, meta: buildMeta({ count, limit, offset }) };
};

const listProducts = async (ctx, query) => {
  const { limit, offset } = parsePagination(query);
  const activeOnly = query.activeOnly === undefined ? true : query.activeOnly === 'true';
  const { count, rows } = await repo.findProducts({ ...ctx, limit, offset, activeOnly });
  return { data: rows, meta: buildMeta({ count, limit, offset }) };
};

const listSales = async (ctx, query) => {
  const { limit, offset } = parsePagination(query);
  const { from, to } = parseDateRange(query);
  const { count, rows } = await repo.findSales({ ...ctx, limit, offset, from, to });
  return { data: rows, meta: buildMeta({ count, limit, offset }) };
};

const listExpenses = async (ctx, query) => {
  const { limit, offset } = parsePagination(query);
  const { from, to } = parseDateRange(query);
  const { count, rows } = await repo.findExpenses({ ...ctx, limit, offset, from, to });
  return { data: rows, meta: buildMeta({ count, limit, offset }) };
};

const listPurchases = async (ctx, query) => {
  const { limit, offset } = parsePagination(query);
  const { from, to } = parseDateRange(query);
  const { count, rows } = await repo.findPurchases({ ...ctx, limit, offset, from, to });
  return { data: rows, meta: buildMeta({ count, limit, offset }) };
};

const getMetrics = async (ctx, query) => {
  const { from, to } = parseDateRange(query);
  return repo.getAggregatedMetrics({ ...ctx, from, to });
};

module.exports = {
  listTenants,
  listProducts,
  listSales,
  listExpenses,
  listPurchases,
  getMetrics,
  // exported for tests
  _internal: { parsePagination, parseDate, parseDateRange, MAX_LIMIT, DEFAULT_LIMIT },
};
