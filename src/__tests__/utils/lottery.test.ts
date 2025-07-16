import { describe, it, expect } from 'vitest';
import {
  calculateLifetimeStats,
  formatCurrency,
  formatLargeNumber,
  generateRandomNumbers,
  validateNumbers,
  LOTTERY_CONFIG,
  PRIZE_TIERS,
} from '../../utils/lottery';

describe('Lottery Utils', () => {
  describe('calculateLifetimeStats', () => {
    it('should calculate basic statistics correctly', () => {
      const birthDate = new Date('1990-01-01');
      const linesPerWeek = 2;
      const stats = calculateLifetimeStats(linesPerWeek, birthDate);

      expect(stats.linesPerWeek).toBe(2);
      expect(stats.birthDate).toEqual(birthDate);
      expect(stats.yearsToWin).toBeGreaterThan(0n);
      expect(stats.ageAtWin).toBeGreaterThan(0n);
      expect(stats.lifetimeSpend).toBeGreaterThan(0);
      expect(stats.netOutcome).toBeLessThan(0); // Should be negative (loss)
    });

    it('should handle different lines per week', () => {
      const birthDate = new Date('1990-01-01');
      const stats1 = calculateLifetimeStats(1, birthDate);
      const stats2 = calculateLifetimeStats(2, birthDate);

      expect(stats1.yearsToWin).toBeGreaterThan(stats2.yearsToWin);
      expect(stats1.lifetimeSpend).toBeGreaterThan(stats2.lifetimeSpend);
    });
  });

  describe('formatCurrency', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(1000)).toBe('£1,000');
      expect(formatCurrency(1500.5)).toBe('£1,501');
    });

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-1000)).toBe('-£1,000');
    });
  });

  describe('formatLargeNumber', () => {
    it('should format numbers with appropriate suffixes', () => {
      expect(formatLargeNumber(1000)).toBe('1.0K');
      expect(formatLargeNumber(1500000)).toBe('1.5M');
      expect(formatLargeNumber(2000000000)).toBe('2.0B');
      expect(formatLargeNumber(500)).toBe('500');
    });

    it('should handle BigInt values', () => {
      expect(formatLargeNumber(1000000n)).toBe('1.0M');
      expect(formatLargeNumber(1000000000n)).toBe('1.0B');
    });
  });

  describe('generateRandomNumbers', () => {
    it('should generate valid main numbers', () => {
      const numbers = generateRandomNumbers();

      expect(numbers.main).toHaveLength(5);
      expect(numbers.main.every((n) => n >= 1 && n <= 50)).toBe(true);
      expect(new Set(numbers.main).size).toBe(5); // No duplicates
      expect(numbers.main).toEqual([...numbers.main].sort((a, b) => a - b)); // Sorted
    });

    it('should generate valid lucky numbers', () => {
      const numbers = generateRandomNumbers();

      expect(numbers.lucky).toHaveLength(2);
      expect(numbers.lucky.every((n) => n >= 1 && n <= 12)).toBe(true);
      expect(new Set(numbers.lucky).size).toBe(2); // No duplicates
      expect(numbers.lucky).toEqual([...numbers.lucky].sort((a, b) => a - b)); // Sorted
    });
  });

  describe('validateNumbers', () => {
    it('should validate correct numbers', () => {
      expect(validateNumbers([1, 2, 3, 4, 5], [1, 2])).toBe(true);
      expect(validateNumbers([10, 20, 30, 40, 50], [11, 12])).toBe(true);
    });

    it('should reject invalid main numbers', () => {
      expect(validateNumbers([1, 2, 3, 4], [1, 2])).toBe(false); // Too few
      expect(validateNumbers([1, 2, 3, 4, 5, 6], [1, 2])).toBe(false); // Too many
      expect(validateNumbers([0, 2, 3, 4, 5], [1, 2])).toBe(false); // Out of range
      expect(validateNumbers([1, 2, 3, 4, 51], [1, 2])).toBe(false); // Out of range
      expect(validateNumbers([1, 2, 3, 4, 4], [1, 2])).toBe(false); // Duplicates
    });

    it('should reject invalid lucky numbers', () => {
      expect(validateNumbers([1, 2, 3, 4, 5], [1])).toBe(false); // Too few
      expect(validateNumbers([1, 2, 3, 4, 5], [1, 2, 3])).toBe(false); // Too many
      expect(validateNumbers([1, 2, 3, 4, 5], [0, 2])).toBe(false); // Out of range
      expect(validateNumbers([1, 2, 3, 4, 5], [1, 13])).toBe(false); // Out of range
      expect(validateNumbers([1, 2, 3, 4, 5], [1, 1])).toBe(false); // Duplicates
    });
  });

  describe('LOTTERY_CONFIG', () => {
    it('should have correct configuration', () => {
      expect(LOTTERY_CONFIG.jackpot).toBe(139838160n);
      expect(LOTTERY_CONFIG.drawsPerWeek).toBe(2);
      expect(LOTTERY_CONFIG.costPerLine).toBe(2.5);
    });
  });

  describe('PRIZE_TIERS', () => {
    it('should have correct number of tiers', () => {
      expect(PRIZE_TIERS).toHaveLength(13);
    });

    it('should have jackpot as first tier', () => {
      expect(PRIZE_TIERS[0].match).toBe('5+2');
      expect(PRIZE_TIERS[0].odds).toBe(139838160n);
    });
  });
});
