// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../config/database', () => ({
  transaction: jest.fn(),
}));

jest.mock('../../modules/products/products.repository', () => ({
  findById: jest.fn(),
}));

jest.mock('../../modules/purchases/purchases.repository', () => ({
  create: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

const sequelize = require('../../config/database');
const productRepository = require('../../modules/products/products.repository');
const purchasesRepository = require('../../modules/purchases/purchases.repository');
const purchasesService = require('../../modules/purchases/purchases.service');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct = (overrides = {}) => ({
  id: 1,
  name: 'Huevo',
  stockQuantity: 10,
  unitPrice: 50,
  tenantId: 1,
  isActive: true,
  update: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const basePurchaseInput = {
  tenantId: 1,
  productId: 1,
  userId: 1,
  quantity: 5,
  cost: 40,
  price: 60,
  marginAmount: 20,
  purchaseDate: '2026-03-17',
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let mockT;

beforeEach(() => {
  mockT = {
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
  };
  sequelize.transaction.mockResolvedValue(mockT);
  purchasesRepository.create.mockResolvedValue({ id: 1, ...basePurchaseInput });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('purchasesService.createPurchase', () => {
  describe('actualización de stock', () => {
    it('suma la cantidad al stock existente: stock=10 + compra=5 → stock=15', async () => {
      const product = mockProduct({ stockQuantity: 10 });
      productRepository.findById.mockResolvedValue(product);

      await purchasesService.createPurchase({ ...basePurchaseInput, quantity: 5 });

      expect(product.update).toHaveBeenCalledWith(
        expect.objectContaining({ stockQuantity: 15 }),
        { transaction: mockT }
      );
    });

    it('actualiza el precio de venta con el nuevo precio', async () => {
      const product = mockProduct({ unitPrice: 50 });
      productRepository.findById.mockResolvedValue(product);

      await purchasesService.createPurchase({ ...basePurchaseInput, price: 80 });

      expect(product.update).toHaveBeenCalledWith(
        expect.objectContaining({ unitPrice: 80 }),
        { transaction: mockT }
      );
    });

    it('retorna previousStock y newStock correctos', async () => {
      const product = mockProduct({ stockQuantity: 7 });
      productRepository.findById.mockResolvedValue(product);

      const result = await purchasesService.createPurchase({ ...basePurchaseInput, quantity: 3 });

      expect(result.previousStock).toBe(7);
      expect(result.newStock).toBe(10);
    });
  });

  describe('aislamiento multi-tenant', () => {
    it('producto no encontrado (otro tenant) → lanza AppError 404 y rollback', async () => {
      productRepository.findById.mockResolvedValue(null);

      await expect(
        purchasesService.createPurchase({ ...basePurchaseInput, productId: 99 })
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(mockT.rollback).toHaveBeenCalled();
    });
  });

  describe('transacción atómica', () => {
    it('falla en DB → rollback y re-throw', async () => {
      const product = mockProduct();
      productRepository.findById.mockResolvedValue(product);
      purchasesRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        purchasesService.createPurchase(basePurchaseInput)
      ).rejects.toThrow('DB error');

      expect(mockT.rollback).toHaveBeenCalled();
      expect(mockT.commit).not.toHaveBeenCalled();
    });

    it('éxito → commit llamado', async () => {
      productRepository.findById.mockResolvedValue(mockProduct());

      await purchasesService.createPurchase(basePurchaseInput);

      expect(mockT.commit).toHaveBeenCalled();
      expect(mockT.rollback).not.toHaveBeenCalled();
    });
  });
});
