// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../models', () => ({
  Sale: { sum: jest.fn(), findAll: jest.fn() },
  Expense: { sum: jest.fn(), findAll: jest.fn() },
  SaleItem: {},
  Product: {},
  User: {},
}));

// ── Imports ──────────────────────────────────────────────────────────────────

const { Sale, Expense } = require('../../models');
const dashboardService = require('../../modules/dashboard/dashboard.service');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('dashboardService.getDailySummary', () => {
  describe('cálculo de saldo neto', () => {
    it('netBalance = totalIncome - totalExpenses', async () => {
      Sale.sum.mockResolvedValue(1000);
      Expense.sum.mockResolvedValue(300);

      const result = await dashboardService.getDailySummary('2026-03-17', 1);

      expect(result.totalIncome).toBe(1000);
      expect(result.totalExpenses).toBe(300);
      expect(result.netBalance).toBe(700);
    });

    it('sin datos → { totalIncome: 0, totalExpenses: 0, netBalance: 0 }', async () => {
      Sale.sum.mockResolvedValue(null);
      Expense.sum.mockResolvedValue(null);

      const result = await dashboardService.getDailySummary('2026-03-17', 1);

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.netBalance).toBe(0);
    });

    it('solo ingresos, sin egresos → netBalance positivo', async () => {
      Sale.sum.mockResolvedValue(500);
      Expense.sum.mockResolvedValue(null);

      const result = await dashboardService.getDailySummary('2026-03-17', 1);

      expect(result.netBalance).toBe(500);
    });

    it('solo egresos, sin ingresos → netBalance negativo', async () => {
      Sale.sum.mockResolvedValue(null);
      Expense.sum.mockResolvedValue(200);

      const result = await dashboardService.getDailySummary('2026-03-17', 1);

      expect(result.netBalance).toBe(-200);
    });
  });

  describe('aislamiento multi-tenant', () => {
    it('filtra ventas por tenantId', async () => {
      Sale.sum.mockResolvedValue(0);
      Expense.sum.mockResolvedValue(0);

      await dashboardService.getDailySummary('2026-03-17', 42);

      expect(Sale.sum).toHaveBeenCalledWith('totalAmount', expect.objectContaining({
        where: expect.objectContaining({ tenantId: 42 }),
      }));
    });

    it('filtra egresos por tenantId', async () => {
      Sale.sum.mockResolvedValue(0);
      Expense.sum.mockResolvedValue(0);

      await dashboardService.getDailySummary('2026-03-17', 42);

      expect(Expense.sum).toHaveBeenCalledWith('amount', expect.objectContaining({
        where: expect.objectContaining({ tenantId: 42 }),
      }));
    });
  });

  describe('fecha en respuesta', () => {
    it('devuelve la fecha recibida como parámetro', async () => {
      Sale.sum.mockResolvedValue(0);
      Expense.sum.mockResolvedValue(0);

      const result = await dashboardService.getDailySummary('2026-03-17', 1);

      expect(result.date).toBe('2026-03-17');
    });
  });
});
