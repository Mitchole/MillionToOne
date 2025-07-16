import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStarsForCell, generateBackgroundStars, BASE_LOD_LEVELS } from '../../utils/starfield';
import { performanceMonitor } from '../../utils/performance';

describe('Starfield Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Star Generation Performance', () => {
    it('should generate stars within acceptable time limits', () => {
      const lod = BASE_LOD_LEVELS[0];
      const start = performance.now();

      // Generate stars for a 10x10 grid
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          getStarsForCell(x, y, lod);
        }
      }

      const end = performance.now();
      const duration = end - start;

      // Should generate 100 cells worth of stars in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should cache stars effectively', () => {
      const lod = BASE_LOD_LEVELS[0];

      // First call - should generate stars
      const start1 = performance.now();
      getStarsForCell(0, 0, lod);
      const end1 = performance.now();
      const firstCallDuration = end1 - start1;

      // Second call - should use cache
      const start2 = performance.now();
      getStarsForCell(0, 0, lod);
      const end2 = performance.now();
      const secondCallDuration = end2 - start2;

      // Cached call should be significantly faster
      expect(secondCallDuration).toBeLessThan(firstCallDuration * 0.1);
    });

    it('should handle large background star generation efficiently', () => {
      const start = performance.now();

      const stars = generateBackgroundStars(1920, 1080, 500);

      const end = performance.now();
      const duration = end - start;

      expect(stars).toHaveLength(500);
      expect(duration).toBeLessThan(50); // Should generate 500 stars in under 50ms
    });
  });

  describe('LOD Performance', () => {
    it('should scale appropriately with different LOD levels', () => {
      const results = BASE_LOD_LEVELS.map((lod: any) => {
        const start = performance.now();

        // Generate 100 cells for each LOD
        for (let i = 0; i < 100; i++) {
          getStarsForCell(i % 10, Math.floor(i / 10), lod);
        }

        const end = performance.now();
        return {
          level: lod.level,
          duration: end - start,
          starsPerCell: lod.starsPerCell,
        };
      });

      // Each LOD level should complete in reasonable time
      results.forEach((result: any) => {
        expect(result.duration).toBeLessThan(200);
      });

      // Higher LOD levels might take longer due to more stars
      expect(results[2].duration).toBeGreaterThanOrEqual(results[0].duration);
    });
  });

  describe('Memory Usage', () => {
    it('should not create excessive memory allocations', () => {
      const lod = BASE_LOD_LEVELS[1];
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Generate stars for a large grid
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
          getStarsForCell(x, y, lod);
        }
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase memory by more than 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Canvas Rendering Performance', () => {
    it('should simulate canvas rendering performance', () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = mockCanvas.getContext('2d')!;

      // Mock canvas dimensions
      mockCanvas.width = 1920;
      mockCanvas.height = 1080;

      const lod = BASE_LOD_LEVELS[0];
      const start = performance.now();

      // Simulate rendering 100 cells
      for (let cx = 0; cx < 10; cx++) {
        for (let cy = 0; cy < 10; cy++) {
          const stars = getStarsForCell(cx, cy, lod);

          // Simulate drawing each star
          stars.forEach((star) => {
            mockCtx.fillStyle = star.color;
            mockCtx.beginPath();
            mockCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            mockCtx.fill();
          });
        }
      }

      const end = performance.now();
      const duration = end - start;

      // Should render 100 cells in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      performanceMonitor.start();

      // Simulate some work
      const lod = BASE_LOD_LEVELS[0];
      for (let i = 0; i < 10; i++) {
        getStarsForCell(i, 0, lod);
        performanceMonitor.incrementCanvasOperation();
      }

      const metrics = performanceMonitor.getMetrics();

      expect(metrics.canvasOperations).toBe(10);
      expect(metrics.frameTime).toBeGreaterThan(0);

      performanceMonitor.stop();
    });
  });
});
