// Star Worker Manager - manages Web Worker for star generation
import { Star, LODLevel } from '../types/canvas';

interface StarRequest {
  cellX: number;
  cellY: number;
  zoom: number;
  seed: number;
  requestId: string;
}

interface StarResponse {
  stars: Star[];
  cellKey: string;
  requestId: string;
  lod: LODLevel;
}

interface PendingRequest {
  resolve: (stars: Star[]) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class StarWorkerManager {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private fallbackMode = false;
  private requestCounter = 0;
  private starCache = new Map<string, Star[]>();
  private readonly maxCacheSize = 2000;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create worker from the starWorker.ts file
      this.worker = new Worker(new URL('../workers/starWorker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (event) => {
        const { type, requestId, stars, cellKey } = event.data;

        if (type === 'STARS_GENERATED') {
          const request = this.pendingRequests.get(requestId);
          if (request) {
            this.pendingRequests.delete(requestId);

            // Cache the stars
            this.starCache.set(cellKey, stars);
            this.manageCacheSize();

            request.resolve(stars);
          }
        }
      };

      this.worker.onerror = (error) => {
        console.warn('Star Worker error, falling back to main thread:', error);
        this.fallbackMode = true;
        this.cleanup();
      };
    } catch (error) {
      console.warn('Web Worker not available, using main thread fallback:', error);
      this.fallbackMode = true;
    }
  }

  private manageCacheSize() {
    if (this.starCache.size > this.maxCacheSize) {
      const keysToDelete = Array.from(this.starCache.keys()).slice(
        0,
        this.starCache.size - this.maxCacheSize,
      );
      keysToDelete.forEach((key) => this.starCache.delete(key));
    }
  }

  private generateStarsFallback(cellX: number, cellY: number, zoom: number, seed: number): Star[] {
    // Fallback star generation on main thread
    const lod = this.generateDynamicLOD(zoom);
    const rng = this.createSeededRandom(seed);
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
  }

  private generateDynamicLOD(zoom: number): LODLevel {
    if (zoom <= 0) {
      return { level: 0, zoomThreshold: 0, cellSize: 2000, starsPerCell: 100, name: 'distant' };
    }
    if (zoom <= 5) {
      return { level: 1, zoomThreshold: 5, cellSize: 500, starsPerCell: 150, name: 'mid' };
    }
    if (zoom <= 40) {
      return { level: 2, zoomThreshold: 40, cellSize: 100, starsPerCell: 200, name: 'near' };
    }

    const level = 3 + Math.floor(zoom / 100);
    const scaleFactor = zoom / 100;

    return {
      level,
      zoomThreshold: zoom,
      cellSize: Math.max(10, 100 / scaleFactor),
      starsPerCell: Math.min(400, 200 + scaleFactor * 50),
      name: `ultra-${level}`,
    };
  }

  private createSeededRandom(seed: number) {
    return {
      next: () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
    };
  }

  private generateSeed(cellX: number, cellY: number, level: number): number {
    return (cellX * 1000 + cellY) * 10000 + level;
  }

  async getStarsForCell(cellX: number, cellY: number, zoom: number): Promise<Star[]> {
    const lod = this.generateDynamicLOD(zoom);
    const cellKey = `${lod.level}-${cellX},${cellY}`;

    // Check cache first
    if (this.starCache.has(cellKey)) {
      return this.starCache.get(cellKey)!;
    }

    const seed = this.generateSeed(cellX, cellY, lod.level);

    // Use fallback if worker is not available
    if (this.fallbackMode || !this.worker) {
      const stars = this.generateStarsFallback(cellX, cellY, zoom, seed);
      this.starCache.set(cellKey, stars);
      this.manageCacheSize();
      return stars;
    }

    // Use Web Worker
    return new Promise((resolve, reject) => {
      const requestId = `${++this.requestCounter}`;

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Clean up old requests (timeout after 5 seconds)
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Star generation timeout'));
        }
      }, 5000);

      this.worker!.postMessage({
        type: 'GENERATE_STARS',
        cellX,
        cellY,
        zoom,
        seed,
        requestId,
      });
    });
  }

  clearDistantStars(currentZoom: number, cameraX: number, cameraY: number): void {
    const currentLOD = this.generateDynamicLOD(currentZoom);
    const maxDistance = currentLOD.cellSize * 5;

    const keysToDelete: string[] = [];

    this.starCache.forEach((stars, cellKey) => {
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

    keysToDelete.forEach((key) => this.starCache.delete(key));
  }

  getCacheSize(): number {
    return this.starCache.size;
  }

  clearCache(): void {
    this.starCache.clear();
  }

  cleanup(): void {
    // Clear pending requests
    this.pendingRequests.forEach((request) => {
      request.reject(new Error('Worker cleanup'));
    });
    this.pendingRequests.clear();

    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
export const starWorkerManager = new StarWorkerManager();
