// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../config/database', () => ({
  transaction: jest.fn(),
}));

jest.mock('../../models', () => ({
  EggCategory: { findOne: jest.fn() },
  Product: { findOne: jest.fn() },
}));

jest.mock('../../modules/purchases/purchases.repository', () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findReceiptById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

const sequelize = require('../../config/database');
const { Product, EggCategory } = require('../../models');
const purchasesRepository = require('../../modules/purchases/purchases.repository');
const purchasesService = require('../../modules/purchases/purchases.service');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProduct = (overrides = {}) => ({
  id: 1,
  name: 'Aceite',
  stockQuantity: '10',
  unitPrice: 50,
  tenantId: 1,
  isActive: true,
  update: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const mockCategory = (overrides = {}) => ({
  id: 1,
  name: 'Jumbo',
  stockUnits: '720',
  eggsPerCrate: 240,
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
  purchaseDate: '2026-03-17',
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let mockT;

beforeEach(() => {
  mockT = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    LOCK: { UPDATE: 'UPDATE' },
  };
  sequelize.transaction.mockResolvedValue(mockT);
  purchasesRepository.create.mockResolvedValue({ id: 1, ...basePurchaseInput });
  jest.clearAllMocks();
  sequelize.transaction.mockResolvedValue(mockT);
  purchasesRepository.create.mockResolvedValue({ id: 1, ...basePurchaseInput });
});

// ── createPurchase (single — legacy) ─────────────────────────────────────────

describe('purchasesService.createPurchase', () => {
  describe('producto genérico — actualización de stock', () => {
    it('suma la cantidad al stock existente: stock=10 + compra=5 → stock=15', async () => {
      const product = mockProduct({ stockQuantity: '10' });
      Product.findOne.mockResolvedValue(product);

      await purchasesService.createPurchase({ ...basePurchaseInput, quantity: 5 });

      expect(product.update).toHaveBeenCalledWith(
        expect.objectContaining({ stockQuantity: 15 }),
        { transaction: mockT }
      );
    });

    it('actualiza el precio de venta con el nuevo precio', async () => {
      const product = mockProduct({ unitPrice: 50 });
      Product.findOne.mockResolvedValue(product);

      await purchasesService.createPurchase({ ...basePurchaseInput, price: 80 });

      expect(product.update).toHaveBeenCalledWith(
        expect.objectContaining({ unitPrice: 80 }),
        { transaction: mockT }
      );
    });

    it('retorna previousStock y newStock correctos', async () => {
      const product = mockProduct({ stockQuantity: '7' });
      Product.findOne.mockResolvedValue(product);

      const result = await purchasesService.createPurchase({ ...basePurchaseInput, quantity: 3 });

      expect(result.previousStock).toBe(7);
      expect(result.newStock).toBe(10);
    });
  });

  describe('aislamiento multi-tenant', () => {
    it('producto no encontrado → lanza AppError 404 y rollback', async () => {
      Product.findOne.mockResolvedValue(null);

      await expect(
        purchasesService.createPurchase({ ...basePurchaseInput, productId: 99 })
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(mockT.rollback).toHaveBeenCalled();
    });
  });

  describe('transacción atómica', () => {
    it('falla en DB → rollback y re-throw', async () => {
      Product.findOne.mockResolvedValue(mockProduct());
      purchasesRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        purchasesService.createPurchase(basePurchaseInput)
      ).rejects.toThrow('DB error');

      expect(mockT.rollback).toHaveBeenCalled();
      expect(mockT.commit).not.toHaveBeenCalled();
    });

    it('éxito → commit llamado', async () => {
      Product.findOne.mockResolvedValue(mockProduct());
      purchasesRepository.create.mockResolvedValue({ id: 1 });

      await purchasesService.createPurchase(basePurchaseInput);

      expect(mockT.commit).toHaveBeenCalled();
      expect(mockT.rollback).not.toHaveBeenCalled();
    });
  });
});

// ── createPurchaseBulk ────────────────────────────────────────────────────────

describe('purchasesService.createPurchaseBulk', () => {
  const baseBulkInput = {
    tenantId: 1,
    userId: 1,
    receiptData: null,
    receiptMimeType: null,
  };

  describe('huevos por categoría', () => {
    it('suma eggsAdded al stockUnits de la categoría', async () => {
      const category = mockCategory({ stockUnits: '720', eggsPerCrate: 240 });
      EggCategory.findOne.mockResolvedValue(category);
      purchasesRepository.create.mockResolvedValue({ id: 10 });

      const items = [{ categoryId: 1, quantity: 2, cost: 5000, purchaseDate: '2026-05-04' }];
      const results = await purchasesService.createPurchaseBulk({ ...baseBulkInput, items });

      // 2 cajones × 240 = 480 huevos; stock 720 + 480 = 1200
      expect(results[0].eggsAdded).toBe(480);
      expect(results[0].newStock).toBe(1200);
      expect(category.update).toHaveBeenCalledWith(
        { stockUnits: 1200 },
        { transaction: mockT }
      );
    });

    it('múltiples categorías en un mismo bulk → commit único', async () => {
      const cat1 = mockCategory({ id: 1, name: 'Jumbo', stockUnits: '0', eggsPerCrate: 240 });
      const cat2 = mockCategory({ id: 2, name: 'Estándar', stockUnits: '360', eggsPerCrate: 360 });
      EggCategory.findOne
        .mockResolvedValueOnce(cat1)
        .mockResolvedValueOnce(cat2);
      purchasesRepository.create.mockResolvedValue({ id: 1 });

      const items = [
        { categoryId: 1, quantity: 1, cost: 4000, purchaseDate: '2026-05-04' },
        { categoryId: 2, quantity: 2, cost: 3500, purchaseDate: '2026-05-04' },
      ];
      const results = await purchasesService.createPurchaseBulk({ ...baseBulkInput, items });

      expect(results).toHaveLength(2);
      expect(mockT.commit).toHaveBeenCalledTimes(1);
      expect(mockT.rollback).not.toHaveBeenCalled();
    });
  });

  describe('productos genéricos', () => {
    it('suma cantidad al stock del producto', async () => {
      const product = mockProduct({ stockQuantity: '5' });
      Product.findOne.mockResolvedValue(product);
      purchasesRepository.create.mockResolvedValue({ id: 20 });

      const items = [{ productId: 1, quantity: 3, cost: 1000, purchaseDate: '2026-05-04' }];
      const results = await purchasesService.createPurchaseBulk({ ...baseBulkInput, items });

      expect(results[0].newStock).toBe(8);
      expect(product.update).toHaveBeenCalledWith(
        expect.objectContaining({ stockQuantity: 8 }),
        { transaction: mockT }
      );
    });

    it('múltiples productos en un mismo bulk → commit único', async () => {
      const p1 = mockProduct({ id: 1, stockQuantity: '10' });
      const p2 = mockProduct({ id: 2, name: 'Harina', stockQuantity: '0' });
      Product.findOne
        .mockResolvedValueOnce(p1)
        .mockResolvedValueOnce(p2);
      purchasesRepository.create.mockResolvedValue({ id: 1 });

      const items = [
        { productId: 1, quantity: 5, cost: 800, purchaseDate: '2026-05-04' },
        { productId: 2, quantity: 2, cost: 1200, purchaseDate: '2026-05-04' },
      ];
      const results = await purchasesService.createPurchaseBulk({ ...baseBulkInput, items });

      expect(results).toHaveLength(2);
      expect(mockT.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('validaciones', () => {
    it('items vacío → lanza AppError 400', async () => {
      await expect(
        purchasesService.createPurchaseBulk({ ...baseBulkInput, items: [] })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('ítem sin categoryId ni productId → rollback y AppError 400', async () => {
      const items = [{ quantity: 1, cost: 100, purchaseDate: '2026-05-04' }];
      await expect(
        purchasesService.createPurchaseBulk({ ...baseBulkInput, items })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(mockT.rollback).toHaveBeenCalled();
    });

    it('categoría no encontrada → rollback y AppError 404', async () => {
      EggCategory.findOne.mockResolvedValue(null);
      const items = [{ categoryId: 99, quantity: 1, cost: 100, purchaseDate: '2026-05-04' }];
      await expect(
        purchasesService.createPurchaseBulk({ ...baseBulkInput, items })
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockT.rollback).toHaveBeenCalled();
    });

    it('producto no encontrado → rollback y AppError 404', async () => {
      Product.findOne.mockResolvedValue(null);
      const items = [{ productId: 99, quantity: 1, cost: 100, purchaseDate: '2026-05-04' }];
      await expect(
        purchasesService.createPurchaseBulk({ ...baseBulkInput, items })
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockT.rollback).toHaveBeenCalled();
    });

    it('falla en DB → rollback y re-throw', async () => {
      const category = mockCategory();
      EggCategory.findOne.mockResolvedValue(category);
      purchasesRepository.create.mockRejectedValue(new Error('DB error'));

      const items = [{ categoryId: 1, quantity: 1, cost: 100, purchaseDate: '2026-05-04' }];
      await expect(
        purchasesService.createPurchaseBulk({ ...baseBulkInput, items })
      ).rejects.toThrow('DB error');
      expect(mockT.rollback).toHaveBeenCalled();
      expect(mockT.commit).not.toHaveBeenCalled();
    });
  });
});
