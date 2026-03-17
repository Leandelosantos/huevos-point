import { describe, it, expect } from 'vitest';
import { CURRENCY_FORMAT } from '../utils/formatters';

describe('CURRENCY_FORMAT (Intl.NumberFormat es-AR)', () => {
  describe('valores positivos', () => {
    it('formatea 1000 con separador de miles', () => {
      expect(CURRENCY_FORMAT.format(1000)).toMatch(/1\.000/);
    });

    it('formatea 1000 con 2 decimales', () => {
      expect(CURRENCY_FORMAT.format(1000)).toMatch(/,00/);
    });

    it('formatea 1234.5 correctamente → 1.234,50', () => {
      const result = CURRENCY_FORMAT.format(1234.5);
      expect(result).toMatch(/1\.234/);
      expect(result).toMatch(/,50/);
    });

    it('formatea 99.99 → 99,99', () => {
      expect(CURRENCY_FORMAT.format(99.99)).toMatch(/99,99/);
    });
  });

  describe('valor cero', () => {
    it('formatea 0 → 0,00', () => {
      expect(CURRENCY_FORMAT.format(0)).toMatch(/0,00/);
    });
  });

  describe('valores negativos', () => {
    it('formatea -500 con signo negativo', () => {
      expect(CURRENCY_FORMAT.format(-500)).toMatch(/-/);
    });

    it('formatea -1000 con separador de miles', () => {
      expect(CURRENCY_FORMAT.format(-1000)).toMatch(/1\.000/);
    });
  });

  describe('decimales', () => {
    it('siempre muestra exactamente 2 decimales', () => {
      const result = CURRENCY_FORMAT.format(100);
      const decimalPart = result.split(',')[1];
      expect(decimalPart?.replace(/\D/g, '')).toHaveLength(2);
    });

    it('trunca a 2 decimales (no más)', () => {
      const result = CURRENCY_FORMAT.format(1.999);
      // 1.999 redondeado a 2 decimales = 2,00
      expect(result).toMatch(/2,00/);
    });
  });
});
