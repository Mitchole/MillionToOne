/**
 * Mulberry32 seeded random number generator
 * Provides deterministic random numbers for consistent starfield generation
 */
export const mulberry32 = (seed: number): (() => number) => {
  return function (): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Generate a seed from cell coordinates and LOD level
 */
export const generateSeed = (cx: number, cy: number, lodLevel: number): number => {
  return cx * 1999 + cy * 2011 + lodLevel * 3007;
};
