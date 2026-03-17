const { Op } = require('sequelize');

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models', () => ({
  Sale: { sum: jest.fn() },
  Expense: { sum: jest.fn() },
  Product: { findAll: jest.fn() },
  SaleItem: {},
}));

jest.mock('../../config/database', () => ({
  query: jest.fn(),
  QueryTypes: { SELECT: 'SELECT' },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

const { Sale, Expense, Product } = require('../../models');
const metricsService = require('../../modules/metrics/metrics.service');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('metricsService.getMonthlyBalance', () => {
  describe('cálculo de saldo mensual', () => {
    it('netBalance = totalIncome - totalExpenses', async () => {
      Sale.sum.mockResolvedValue(5000);
      Expense.sum.mockResolvedValue(1500);

      const result = await metricsService.getMonthlyBalance(1, 2026, 3);

      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(1500);
      expect(result.netBalance).toBe(3500);
    });

    it('mes sin datos → todo en cero', async () => {
      Sale.sum.mockResolvedValue(null);
      Expense.sum.mockResolvedValue(null);

      const result = await metricsService.getMonthlyBalance(1, 2026, 3);

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.netBalance).toBe(0);
    });

    it('devuelve year y month en la respuesta', async () => {
      Sale.sum.mockResolvedValue(0);
      Expense.sum.mockResolvedValue(0);

      const result = await metricsService.getMonthlyBalance(1, 2026, 3);

      expect(result.year).toBe(2026);
      expect(result.month).toBe(3);
    });
  });

  describe('aislamiento multi-tenant', () => {
    it('filtra ventas y egresos por tenantId', async () => {
      Sale.sum.mockResolvedValue(0);
      Expense.sum.mockResolvedValue(0);

      await metricsService.getMonthlyBalance(7, 2026, 3);

      expect(Sale.sum).toHaveBeenCalledWith('totalAmount', expect.objectContaining({
        where: expect.objectContaining({ tenantId: 7 }),
      }));
      expect(Expense.sum).toHaveBeenCalledWith('amount', expect.objectContaining({
        where: expect.objectContaining({ tenantId: 7 }),
      }));
    });
  });

  describe('rango de fechas del mes', () => {
    it('marzo 2026: startDate=2026-03-01, endDate=2026-03-31', async () => {
      Sale.sum.mockResolvedValue(0);
      Expense.sum.mockResolvedValue(0);

      await metricsService.getMonthlyBalance(1, 2026, 3);

      // Verificar que el where incluye Op.between con fechas correctas
      const callArgs = Sale.sum.mock.calls[0][1];
      const saleDateFilter = callArgs.where.saleDate;
      expect(saleDateFilter).toBeDefined();
      expect(saleDateFilter[Op.between]).toEqual(['2026-03-01', '2026-03-31']);
    });
  });
});

describe('metricsService.getLowStockProducts', () => {
  it('retorna solo productos con stock < 30', async () => {
    Product.findAll.mockResolvedValue([
      { id: 1, name: 'Huevo', stockQuantity: 5, toJSON: () => ({ id: 1, name: 'Huevo', stockQuantity: 5 }) },
    ]);

    const result = await metricsService.getLowStockProducts(1);

    expect(Product.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        tenantId: 1,
      }),
    }));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Huevo');
  });

  it('sin productos bajo umbral → array vacío', async () => {
    Product.findAll.mockResolvedValue([]);

    const result = await metricsService.getLowStockProducts(1);

    expect(result).toHaveLength(0);
  });

  it('filtra por tenantId', async () => {
    Product.findAll.mockResolvedValue([]);

    await metricsService.getLowStockProducts(5);

    expect(Product.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 5 }),
    }));
  });
});
