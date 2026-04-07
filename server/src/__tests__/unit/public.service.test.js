jest.mock('../../modules/public/public.repository', () => ({
  findTenants: jest.fn(),
  findProducts: jest.fn(),
  findSales: jest.fn(),
  findExpenses: jest.fn(),
  findPurchases: jest.fn(),
  getAggregatedMetrics: jest.fn(),
}));

const repo = require('../../modules/public/public.repository');
const service = require('../../modules/public/public.service');
const { _internal } = service;

const ctx = { businessId: 1, tenantId: null };

beforeEach(() => jest.clearAllMocks());

describe('public.service.parsePagination', () => {
  it('aplica defaults cuando no hay query', () => {
    expect(_internal.parsePagination()).toEqual({ limit: 25, offset: 0 });
  });

  it('cap a MAX_LIMIT cuando se excede', () => {
    expect(_internal.parsePagination({ limit: '500' })).toEqual({ limit: 100, offset: 0 });
  });

  it('rechaza valores no numéricos cayendo a defaults', () => {
    expect(_internal.parsePagination({ limit: 'abc', offset: 'xyz' })).toEqual({ limit: 25, offset: 0 });
  });

  it('respeta valores válidos', () => {
    expect(_internal.parsePagination({ limit: '50', offset: '10' })).toEqual({ limit: 50, offset: 10 });
  });
});

describe('public.service.parseDate', () => {
  it('acepta formato YYYY-MM-DD', () => {
    expect(_internal.parseDate('2026-04-06', 'from')).toBe('2026-04-06');
  });

  it('rechaza formato inválido', () => {
    expect(() => _internal.parseDate('06/04/2026', 'from')).toThrow(/inválido/);
  });

  it('devuelve undefined si no hay valor', () => {
    expect(_internal.parseDate(undefined, 'from')).toBeUndefined();
    expect(_internal.parseDate('', 'from')).toBeUndefined();
  });
});

describe('public.service.parseDateRange', () => {
  it('rechaza from > to', () => {
    expect(() => _internal.parseDateRange({ from: '2026-04-10', to: '2026-04-01' }))
      .toThrow(/from.*menor/);
  });

  it('acepta from <= to', () => {
    expect(_internal.parseDateRange({ from: '2026-04-01', to: '2026-04-10' }))
      .toEqual({ from: '2026-04-01', to: '2026-04-10' });
  });
});

describe('public.service.listProducts', () => {
  it('devuelve data + meta con activeOnly por defecto', async () => {
    repo.findProducts.mockResolvedValue({ count: 3, rows: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    const result = await service.listProducts(ctx, {});
    expect(result.data).toHaveLength(3);
    expect(result.meta).toEqual({ total: 3, limit: 25, offset: 0, hasMore: false });
    expect(repo.findProducts).toHaveBeenCalledWith(expect.objectContaining({ activeOnly: true }));
  });

  it('hasMore = true si offset+limit < total', async () => {
    repo.findProducts.mockResolvedValue({ count: 100, rows: [] });
    const result = await service.listProducts(ctx, { limit: '10', offset: '0' });
    expect(result.meta.hasMore).toBe(true);
  });

  it('activeOnly=false si query lo indica', async () => {
    repo.findProducts.mockResolvedValue({ count: 0, rows: [] });
    await service.listProducts(ctx, { activeOnly: 'false' });
    expect(repo.findProducts).toHaveBeenCalledWith(expect.objectContaining({ activeOnly: false }));
  });
});

describe('public.service.listSales', () => {
  it('propaga from/to al repo', async () => {
    repo.findSales.mockResolvedValue({ count: 0, rows: [] });
    await service.listSales(ctx, { from: '2026-04-01', to: '2026-04-30' });
    expect(repo.findSales).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-04-01', to: '2026-04-30' })
    );
  });
});

describe('public.service.getMetrics', () => {
  it('devuelve los totales del repositorio', async () => {
    repo.getAggregatedMetrics.mockResolvedValue({
      totalSales: 5000, totalSalesCount: 10,
      totalExpenses: 2000, totalExpensesCount: 5,
      netBalance: 3000,
    });
    const result = await service.getMetrics(ctx, {});
    expect(result.netBalance).toBe(3000);
  });
});
