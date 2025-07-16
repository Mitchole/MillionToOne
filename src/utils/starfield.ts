import { Star, LODLevel, Dot } from '../types';
import { mulberry32, generateSeed } from './seededRandom';

export const BASE_LOD_LEVELS: LODLevel[] = [
  { level: 0, zoomThreshold: 0, cellSize: 2000, starsPerCell: 100, name: 'Distant' },
  { level: 1, zoomThreshold: 5, cellSize: 500, starsPerCell: 150, name: 'Mid' },
  { level: 2, zoomThreshold: 40, cellSize: 100, starsPerCell: 200, name: 'Near' },
];

/**
 * Get optimal LOD level for current zoom (simplified for stability)
 */
export const generateDynamicLOD = (zoom: number): LODLevel => {
  // Use base levels - for unlimited zoom, just stick with highest level
  for (let i = BASE_LOD_LEVELS.length - 1; i >= 0; i--) {
    if (zoom >= BASE_LOD_LEVELS[i].zoomThreshold) {
      return BASE_LOD_LEVELS[i];
    }
  }

  return BASE_LOD_LEVELS[0];
};

const starCache = new Map<string, Star[]>();

/**
 * Generate stars for a specific cell using seeded random
 */
export const getStarsForCell = (cx: number, cy: number, lod: LODLevel): Star[] => {
  const cellId = `${lod.level}-${cx},${cy}`;

  if (starCache.has(cellId)) {
    return starCache.get(cellId)!;
  }

  const seed = generateSeed(cx, cy, lod.level);
  const random = mulberry32(seed);
  const cellStars: Star[] = [];

  for (let i = 0; i < lod.starsPerCell; i++) {
    cellStars.push({
      x: cx * lod.cellSize + random() * lod.cellSize,
      y: cy * lod.cellSize + random() * lod.cellSize,
      color: `rgba(255, 255, 255, ${0.5 + random() * 0.4})`,
      size: 0.3 + random() * 0.5,
    });
  }

  starCache.set(cellId, cellStars);

  // Prevent cache from growing too large (increased limit for unlimited zoom)
  if (starCache.size > 2000) {
    const firstKey = starCache.keys().next().value;
    if (firstKey) {
      starCache.delete(firstKey);
    }
  }

  return cellStars;
};

/**
 * Generate background stars for parallax effect
 */
export const generateBackgroundStars = (
  width: number,
  height: number,
  count: number = 200,
): Star[] => {
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5,
      color: 'white',
      alpha: 0.2 + Math.random() * 0.5,
    });
  }

  return stars;
};

/**
 * Initialize target and winner dots
 */
export const initializeDots = (): { targetDot: Dot; winnerDot: Dot } => {
  const worldSize = 50000;

  const targetDot: Dot = {
    x: (Math.random() - 0.5) * worldSize,
    y: (Math.random() - 0.5) * worldSize,
    color: '#facc15',
    baseSize: 1,
    size: 1,
  };

  let winnerDot: Dot;

  do {
    winnerDot = {
      x: (Math.random() - 0.5) * worldSize,
      y: (Math.random() - 0.5) * worldSize,
      color: '#60a5fa',
      baseSize: 1,
      size: 1,
    };
  } while (Math.hypot(targetDot.x - winnerDot.x, targetDot.y - winnerDot.y) < worldSize / 2);

  return { targetDot, winnerDot };
};

/**
 * Get optimal LOD level for current zoom (now supports unlimited zoom)
 */
export const getOptimalLOD = (zoom: number): LODLevel => {
  return generateDynamicLOD(zoom);
};

/**
 * Clear distant stars from cache to manage memory
 */
export const clearDistantStars = (currentZoom: number, cameraX: number, cameraY: number): void => {
  const currentLOD = getOptimalLOD(currentZoom);
  const maxDistance = currentLOD.cellSize * 5; // Keep stars within 5 cells of current view

  const keysToDelete: string[] = [];

  starCache.forEach((stars, cellKey) => {
    const [levelStr, coordStr] = cellKey.split('-');
    const [cxStr, cyStr] = coordStr.split(',');
    const cx = parseInt(cxStr);
    const cy = parseInt(cyStr);

    const cellCenterX = cx * currentLOD.cellSize + currentLOD.cellSize / 2;
    const cellCenterY = cy * currentLOD.cellSize + currentLOD.cellSize / 2;

    const distance = Math.hypot(cellCenterX - cameraX, cellCenterY - cameraY);

    if (distance > maxDistance) {
      keysToDelete.push(cellKey);
    }
  });

  keysToDelete.forEach((key) => starCache.delete(key));
};

/**
 * Get cache size for monitoring
 */
export const getCacheSize = (): number => {
  return starCache.size;
};

/**
 * Clear entire star cache
 */
export const clearStarCache = (): void => {
  starCache.clear();
};
