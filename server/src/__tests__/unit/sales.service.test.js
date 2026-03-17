const jwt = require('jsonwebtoken');

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../config/database', () => ({
  transaction: jest.fn(),
}));

jest.mock('../../models', () => ({
  Product: { findOne: jest.fn() },
}));

jest.mock('../../modules/sales/sales.repository', () => ({
  create: jest.fn(),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

const sequelize = require('../../config/database');
const { Product } = require('../../models');
const salesRepository = require('../../modules/sales/sales.repository');
const salesService = require('../../modules/sales/sales.service');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct = (overrides = {}) => ({
  id: 1,
  name: 'Huevo',
  stockQuantity: 10,
  unitPrice: 100,
  tenantId: 1,
  isActive: true,
  update: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const baseSaleInput = {
  userId: 1,
  tenantId: 1,
  paymentMethod: 'CASH',
  saleDate: '2026-03-17',
  items: [{ productId: 1, quantity: 2, discount: 0 }],
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let mockT;

beforeEach(() => {
  mockT = {
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    LOCK: { UPDATE: 'UPDATE' },
  };
  sequelize.transaction.mockResolvedValue(mockT);
  salesRepository.create.mockResolvedValue({ id: 1, totalAmount: 200 });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('salesService.registerSale', () => {
  describe('cálculo de stock', () => {
    it('descuenta la cantidad del stock correctamente', async () => {
      const product = mockProduct({ stockQuantity: 10 });
      Product.findOne.mockResolvedValue(product);

      await salesService.registerSale(1, [{ productId: 1, quantity: 3, discount: 0 }], 'CASH', 1, '2026-03-17');

      expect(product.update).toHaveBeenCalledWith(
        { stockQuantity: 7 },
        { transaction: mockT }
      );
    });

    it('descuenta stock de 2 ítems distintos', async () => {
      const product1 = mockProduct({ id: 1, stockQuantity: 10 });
      const product2 = mockProduct({ id: 2, stockQuantity: 5 });
      Product.findOne
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      await salesService.registerSale(
        1,
        [{ productId: 1, quantity: 2, discount: 0 }, { productId: 2, quantity: 1, discount: 0 }],
        'CASH', 1, '2026-03-17'
      );

      expect(product1.update).toHaveBeenCalledWith({ stockQuantity: 8 }, expect.anything());
      expect(product2.update).toHaveBeenCalledWith({ stockQuantity: 4 }, expect.anything());
    });

    it('stock insuficiente → lanza AppError 400 y rollback', async () => {
      Product.findOne.mockResolvedValue(mockProduct({ stockQuantity: 1 }));

      await expect(
        salesService.registerSale(1, [{ productId: 1, quantity: 5, discount: 0 }], 'CASH', 1, '2026-03-17')
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(mockT.rollback).toHaveBeenCalled();
      expect(mockT.commit).not.toHaveBeenCalled();
    });
  });

  describe('cálculo de totalAmount', () => {
    it('sin descuento: precio=100, qty=2 → totalAmount=200', async () => {
      Product.findOne.mockResolvedValue(mockProduct({ unitPrice: 100, stockQuantity: 10 }));

      await salesService.registerSale(1, [{ productId: 1, quantity: 2, discount: 0 }], 'CASH', 1, '2026-03-17');

      expect(salesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 200 }),
        expect.any(Array),
        1,
        mockT
      );
    });

    it('con descuento 10%: precio=100, qty=2 → totalAmount=180', async () => {
      Product.findOne.mockResolvedValue(mockProduct({ unitPrice: 100, stockQuantity: 10 }));

      await salesService.registerSale(1, [{ productId: 1, quantity: 2, discount: 10 }], 'CASH', 1, '2026-03-17');

      expect(salesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 180 }),
        expect.any(Array),
        1,
        mockT
      );
    });

    it('con descuento 100%: totalAmount=0', async () => {
      Product.findOne.mockResolvedValue(mockProduct({ unitPrice: 100, stockQuantity: 10 }));

      await salesService.registerSale(1, [{ productId: 1, quantity: 1, discount: 100 }], 'CASH', 1, '2026-03-17');

      expect(salesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 0 }),
        expect.any(Array),
        1,
        mockT
      );
    });
  });

  describe('aislamiento multi-tenant', () => {
    it('producto no encontrado (otro tenant) → lanza AppError 404 y rollback', async () => {
      Product.findOne.mockResolvedValue(null);

      await expect(
        salesService.registerSale(1, [{ productId: 99, quantity: 1, discount: 0 }], 'CASH', 1, '2026-03-17')
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(mockT.rollback).toHaveBeenCalled();
    });

    it('producto inactivo → lanza AppError 404', async () => {
      Product.findOne.mockResolvedValue(mockProduct({ isActive: false }));

      await expect(
        salesService.registerSale(1, [{ productId: 1, quantity: 1, discount: 0 }], 'CASH', 1, '2026-03-17')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('transacción atómica', () => {
    it('falla en DB → rollback y re-throw del error', async () => {
      Product.findOne.mockResolvedValue(mockProduct());
      salesRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        salesService.registerSale(1, [{ productId: 1, quantity: 1, discount: 0 }], 'CASH', 1, '2026-03-17')
      ).rejects.toThrow('DB error');

      expect(mockT.rollback).toHaveBeenCalled();
    });

    it('éxito → commit llamado', async () => {
      Product.findOne.mockResolvedValue(mockProduct());

      await salesService.registerSale(1, [{ productId: 1, quantity: 1, discount: 0 }], 'CASH', 1, '2026-03-17');

      expect(mockT.commit).toHaveBeenCalled();
      expect(mockT.rollback).not.toHaveBeenCalled();
    });
  });
});
