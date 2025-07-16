// Star Worker for background star generation
// This worker offloads star generation from the main thread to maintain 60fps

import { Star, LODLevel } from '../types/canvas';

// Mulberry32 seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed |= 0;
    this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

// Dynamic LOD level generation
const generateDynamicLOD = (zoom: number): LODLevel => {
  if (zoom <= 0) {
    return {
      level: 0,
      zoomThreshold: 0,
      cellSize: 2000,
      starsPerCell: 100,
      name: 'distant',
    };
  }

  if (zoom <= 5) {
    return {
      level: 1,
      zoomThreshold: 5,
      cellSize: 500,
      starsPerCell: 150,
      name: 'mid',
    };
  }

  if (zoom <= 40) {
    return {
      level: 2,
      zoomThreshold: 40,
      cellSize: 100,
      starsPerCell: 200,
      name: 'near',
    };
  }

  // Dynamic LOD for extreme zoom levels
  const level = 3 + Math.floor(zoom / 100);
  const scaleFactor = zoom / 100;

  return {
    level,
    zoomThreshold: zoom,
    cellSize: Math.max(10, 100 / scaleFactor),
    starsPerCell: Math.min(400, 200 + scaleFactor * 50),
    name: `ultra-${level}`,
  };
};

// Generate stars for a specific cell
const generateStarsForCell = (
  cellX: number,
  cellY: number,
  lod: LODLevel,
  seed: number,
): Star[] => {
  const rng = new SeededRandom(seed);
  const stars: Star[] = [];

  for (let i = 0; i < lod.starsPerCell; i++) {
    const localX = rng.next() * lod.cellSize;
    const localY = rng.next() * lod.cellSize;

    const star: Star = {
      x: cellX * lod.cellSize + localX,
      y: cellY * lod.cellSize + localY,
      size: 0.3 + rng.next() * 0.5,
      alpha: 0.5 + rng.next() * 0.4,
      color: `rgba(255, 255, 255, ${0.5 + rng.next() * 0.4})`,
    };

    stars.push(star);
  }

  return stars;
};

// Worker message types
interface StarRequest {
  type: 'GENERATE_STARS';
  cellX: number;
  cellY: number;
  zoom: number;
  seed: number;
  requestId: string;
}

interface StarResponse {
  type: 'STARS_GENERATED';
  stars: Star[];
  cellKey: string;
  requestId: string;
  lod: LODLevel;
}

interface BatchStarRequest {
  type: 'GENERATE_BATCH';
  cells: Array<{
    cellX: number;
    cellY: number;
    zoom: number;
    seed: number;
  }>;
  requestId: string;
}

interface BatchStarResponse {
  type: 'BATCH_GENERATED';
  batches: Array<{
    cellKey: string;
    stars: Star[];
    lod: LODLevel;
  }>;
  requestId: string;
}

// Worker message handler
self.onmessage = (event: MessageEvent<StarRequest | BatchStarRequest>) => {
  const { data } = event;

  if (data.type === 'GENERATE_STARS') {
    const { cellX, cellY, zoom, seed, requestId } = data;
    const lod = generateDynamicLOD(zoom);
    const stars = generateStarsForCell(cellX, cellY, lod, seed);
    const cellKey = `${lod.level}-${cellX},${cellY}`;

    const response: StarResponse = {
      type: 'STARS_GENERATED',
      stars,
      cellKey,
      requestId,
      lod,
    };

    self.postMessage(response);
  } else if (data.type === 'GENERATE_BATCH') {
    const { cells, requestId } = data;
    const batches = cells.map(({ cellX, cellY, zoom, seed }) => {
      const lod = generateDynamicLOD(zoom);
      const stars = generateStarsForCell(cellX, cellY, lod, seed);
      const cellKey = `${lod.level}-${cellX},${cellY}`;

      return {
        cellKey,
        stars,
        lod,
      };
    });

    const response: BatchStarResponse = {
      type: 'BATCH_GENERATED',
      batches,
      requestId,
    };

    self.postMessage(response);
  }
};

// Export types for TypeScript
export type { StarRequest, StarResponse, BatchStarRequest, BatchStarResponse };
