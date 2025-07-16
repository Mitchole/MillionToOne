import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStarsForCell,
  generateBackgroundStars,
  initializeDots,
  getOptimalLOD,
  BASE_LOD_LEVELS,
} from '../../utils/starfield';

describe('Starfield Utils', () => {
  beforeEach(() => {
    // Clear any cached stars between tests
    vi.clearAllMocks();
  });

  describe('getStarsForCell', () => {
    it('should generate consistent stars for the same cell', () => {
      const lod = BASE_LOD_LEVELS[0];
      const stars1 = getStarsForCell(0, 0, lod);
      const stars2 = getStarsForCell(0, 0, lod);

      expect(stars1).toEqual(stars2);
      expect(stars1).toHaveLength(lod.starsPerCell);
    });

    it('should generate different stars for different cells', () => {
      const lod = BASE_LOD_LEVELS[0];
      const stars1 = getStarsForCell(0, 0, lod);
      const stars2 = getStarsForCell(1, 0, lod);

      expect(stars1).not.toEqual(stars2);
      expect(stars1).toHaveLength(lod.starsPerCell);
      expect(stars2).toHaveLength(lod.starsPerCell);
    });

    it('should generate stars within cell bounds', () => {
      const lod = BASE_LOD_LEVELS[0];
      const cx = 2;
      const cy = 3;
      const stars = getStarsForCell(cx, cy, lod);

      stars.forEach((star) => {
        expect(star.x).toBeGreaterThanOrEqual(cx * lod.cellSize);
        expect(star.x).toBeLessThanOrEqual((cx + 1) * lod.cellSize);
        expect(star.y).toBeGreaterThanOrEqual(cy * lod.cellSize);
        expect(star.y).toBeLessThanOrEqual((cy + 1) * lod.cellSize);
        expect(star.size).toBeGreaterThan(0);
        expect(star.color).toMatch(/rgba\(255, 255, 255, 0\.\d+\)/);
      });
    });

    it('should handle different LOD levels', () => {
      const cell = { cx: 0, cy: 0 };

      BASE_LOD_LEVELS.forEach((lod: any) => {
        const stars = getStarsForCell(cell.cx, cell.cy, lod);
        expect(stars).toHaveLength(lod.starsPerCell);
      });
    });
  });

  describe('generateBackgroundStars', () => {
    it('should generate the correct number of stars', () => {
      const width = 1000;
      const height = 800;
      const count = 150;

      const stars = generateBackgroundStars(width, height, count);
      expect(stars).toHaveLength(count);
    });

    it('should generate stars within bounds', () => {
      const width = 1000;
      const height = 800;
      const stars = generateBackgroundStars(width, height, 100);

      stars.forEach((star) => {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(width);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(height);
        expect(star.size).toBeGreaterThan(0);
        expect(star.alpha).toBeGreaterThan(0);
        expect(star.color).toBe('white');
      });
    });

    it('should use default count when not provided', () => {
      const stars = generateBackgroundStars(1000, 800);
      expect(stars).toHaveLength(200);
    });
  });

  describe('initializeDots', () => {
    it('should create target and winner dots', () => {
      const { targetDot, winnerDot } = initializeDots();

      expect(targetDot).toBeDefined();
      expect(winnerDot).toBeDefined();

      expect(targetDot.color).toBe('#facc15');
      expect(winnerDot.color).toBe('#60a5fa');

      expect(targetDot.size).toBe(1);
      expect(winnerDot.size).toBe(1);
      expect(targetDot.baseSize).toBe(1);
      expect(winnerDot.baseSize).toBe(1);
    });

    it('should place dots far enough apart', () => {
      const { targetDot, winnerDot } = initializeDots();
      const distance = Math.hypot(targetDot.x - winnerDot.x, targetDot.y - winnerDot.y);

      expect(distance).toBeGreaterThan(25000); // worldSize / 2
    });

    it('should place dots within world bounds', () => {
      const { targetDot, winnerDot } = initializeDots();
      const worldSize = 50000;

      expect(Math.abs(targetDot.x)).toBeLessThanOrEqual(worldSize / 2);
      expect(Math.abs(targetDot.y)).toBeLessThanOrEqual(worldSize / 2);
      expect(Math.abs(winnerDot.x)).toBeLessThanOrEqual(worldSize / 2);
      expect(Math.abs(winnerDot.y)).toBeLessThanOrEqual(worldSize / 2);
    });
  });

  describe('getOptimalLOD', () => {
    it('should return correct LOD for zoom level 0', () => {
      const lod = getOptimalLOD(0);
      expect(lod).toBe(BASE_LOD_LEVELS[0]);
    });

    it('should return correct LOD for zoom level 5', () => {
      const lod = getOptimalLOD(5);
      expect(lod).toBe(BASE_LOD_LEVELS[1]);
    });

    it('should return correct LOD for zoom level 40', () => {
      const lod = getOptimalLOD(40);
      expect(lod).toBe(BASE_LOD_LEVELS[2]);
    });

    it('should return highest LOD for very high zoom', () => {
      const lod = getOptimalLOD(1000);
      expect(lod).toBe(BASE_LOD_LEVELS[2]);
    });
  });

  describe('BASE_LOD_LEVELS', () => {
    it('should have correct structure', () => {
      expect(BASE_LOD_LEVELS).toHaveLength(3);

      BASE_LOD_LEVELS.forEach((lod: any, index: any) => {
        expect(lod.level).toBe(index);
        expect(lod.zoomThreshold).toBeGreaterThanOrEqual(0);
        expect(lod.cellSize).toBeGreaterThan(0);
        expect(lod.starsPerCell).toBeGreaterThan(0);
        expect(lod.name).toBeTruthy();
      });
    });

    it('should be ordered by zoom threshold', () => {
      for (let i = 1; i < BASE_LOD_LEVELS.length; i++) {
        expect(BASE_LOD_LEVELS[i].zoomThreshold).toBeGreaterThan(
          BASE_LOD_LEVELS[i - 1].zoomThreshold,
        );
      }
    });
  });
});
