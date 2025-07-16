import { describe, it, expect, vi } from 'vitest';
import {
  SCENE_CONFIGS,
  isReducedMotionPreferred,
  applyReducedMotionConfig,
  createGSAPContext,
  killAllAnimations,
} from '../../utils/animation';

// Mock gsap
vi.mock('gsap', () => ({
  default: {
    context: vi.fn(() => ({
      kill: vi.fn(),
    })),
    killTweensOf: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn(),
      call: vi.fn(),
    })),
    to: vi.fn(),
  },
}));

describe('Animation Utils', () => {
  describe('SCENE_CONFIGS', () => {
    it('should have configuration for all scenes', () => {
      const expectedScenes = [
        'landing',
        'ticket',
        'zoom1',
        'zoom2',
        'your-choice',
        'winner-reveal',
        'lifetime',
        'report',
        'none',
      ];

      expectedScenes.forEach((scene) => {
        expect(SCENE_CONFIGS[scene as keyof typeof SCENE_CONFIGS]).toBeDefined();
      });
    });

    it('should have correct ambient panning configuration', () => {
      expect(SCENE_CONFIGS.landing.hasAmbientPanning).toBe(true);
      expect(SCENE_CONFIGS.zoom1.hasAmbientPanning).toBe(true);
      expect(SCENE_CONFIGS.zoom2.hasAmbientPanning).toBe(true);
      expect(SCENE_CONFIGS.lifetime.hasAmbientPanning).toBe(true);

      expect(SCENE_CONFIGS.ticket.hasAmbientPanning).toBe(false);
      expect(SCENE_CONFIGS['your-choice'].hasAmbientPanning).toBe(false);
      expect(SCENE_CONFIGS['winner-reveal'].hasAmbientPanning).toBe(false);
      expect(SCENE_CONFIGS.report.hasAmbientPanning).toBe(false);
    });

    it('should have correct canvas visibility configuration', () => {
      expect(SCENE_CONFIGS.landing.showCanvas).toBe(true);
      expect(SCENE_CONFIGS.ticket.showCanvas).toBe(true);
      expect(SCENE_CONFIGS.zoom1.showCanvas).toBe(true);
      expect(SCENE_CONFIGS['your-choice'].showCanvas).toBe(true);

      expect(SCENE_CONFIGS.lifetime.showCanvas).toBe(false);
      expect(SCENE_CONFIGS.report.showCanvas).toBe(false);
    });
  });

  describe('isReducedMotionPreferred', () => {
    it('should return false when reduced motion is not preferred', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
      }));

      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true,
      });

      expect(isReducedMotionPreferred()).toBe(false);
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should return true when reduced motion is preferred', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: true,
      }));

      Object.defineProperty(window, 'matchMedia', {
        value: mockMatchMedia,
        writable: true,
      });

      expect(isReducedMotionPreferred()).toBe(true);
    });
  });

  describe('applyReducedMotionConfig', () => {
    it('should return original config when reduced motion is not preferred', () => {
      const mockMatchMedia = vi.fn(() => ({ matches: false }));
      Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia });

      const config = { duration: 1, ease: 'power2.inOut' };
      const result = applyReducedMotionConfig(config);

      expect(result).toEqual(config);
    });

    it('should modify config when reduced motion is preferred', () => {
      const mockMatchMedia = vi.fn(() => ({ matches: true }));
      Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia });

      const config = { duration: 1, ease: 'power2.inOut' };
      const result = applyReducedMotionConfig(config);

      expect(result).toEqual({
        duration: 0.1,
        ease: 'none',
      });
    });
  });

  describe('createGSAPContext', () => {
    it('should create a GSAP context', () => {
      const context = createGSAPContext();
      expect(context).toBeDefined();
      expect(context.kill).toBeDefined();
    });
  });

  describe('killAllAnimations', () => {
    it('should call gsap.killTweensOf with "*"', async () => {
      const gsap = await import('gsap').then((m) => m.default);

      killAllAnimations();

      expect(gsap.killTweensOf).toHaveBeenCalledWith('*');
    });
  });
});
