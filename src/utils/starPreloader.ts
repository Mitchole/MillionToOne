// Star Preloader - predictive loading system for seamless zoom experience
import { CameraState, LODLevel } from '../types/canvas';
import { starWorkerManager } from './starWorkerManager';
import { getOptimalLOD } from './starfield';
import { DeviceCapabilityDetector } from './performance';

interface PreloadRequest {
  cellX: number;
  cellY: number;
  zoom: number;
  priority: number;
  timestamp: number;
}

export class StarPreloader {
  private preloadQueue: PreloadRequest[] = [];
  private isProcessing = false;
  private maxConcurrentRequests = 4;
  private activeRequests = 0;
  private preloadRadius = 2; // Number of cells to preload around current view

  constructor() {
    // Start processing queue
    this.processQueue();

    // Initialize device capability detection and adjust settings
    this.initializeDeviceCapabilities();
  }

  private async initializeDeviceCapabilities() {
    try {
      await DeviceCapabilityDetector.detect();
      const performanceScore = DeviceCapabilityDetector.getPerformanceScore();
      this.adjustForPerformance(performanceScore);
    } catch (error) {
      console.warn('Failed to detect device capabilities:', error);
      // Use conservative defaults
      this.adjustForPerformance(0.5);
    }
  }

  /**
   * Preload stars along the zoom trajectory
   */
  predictZoomPath(currentCamera: CameraState, targetCamera: CameraState, duration: number): void {
    const steps = Math.max(5, Math.floor(duration / 100)); // Preload every 100ms of animation

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const interpolatedCamera = {
        x: currentCamera.x + (targetCamera.x - currentCamera.x) * progress,
        y: currentCamera.y + (targetCamera.y - currentCamera.y) * progress,
        zoom: currentCamera.zoom + (targetCamera.zoom - currentCamera.zoom) * progress,
      };

      // Preload stars around the interpolated position
      this.preloadAroundPosition(interpolatedCamera, 1, progress);
    }
  }

  /**
   * Preload stars around a specific position
   */
  preloadAroundPosition(
    camera: CameraState,
    radius: number = this.preloadRadius,
    priority: number = 1,
  ): void {
    const lod = getOptimalLOD(camera.zoom);

    // Calculate visible area
    const viewWidth = window.innerWidth / camera.zoom;
    const viewHeight = window.innerHeight / camera.zoom;

    const startCellX = Math.floor((camera.x - viewWidth / 2) / lod.cellSize) - radius;
    const endCellX = Math.floor((camera.x + viewWidth / 2) / lod.cellSize) + radius;
    const startCellY = Math.floor((camera.y - viewHeight / 2) / lod.cellSize) - radius;
    const endCellY = Math.floor((camera.y + viewHeight / 2) / lod.cellSize) + radius;

    // Add cells to preload queue
    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        // Calculate distance-based priority
        const distance = Math.hypot(cx - camera.x / lod.cellSize, cy - camera.y / lod.cellSize);

        const distancePriority = Math.max(0, 1 - distance / (radius * 2));
        const finalPriority = priority * distancePriority;

        this.addToQueue({
          cellX: cx,
          cellY: cy,
          zoom: camera.zoom,
          priority: finalPriority,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Preload stars based on zoom direction and speed
   */
  predictivePreload(
    camera: CameraState,
    velocity: { x: number; y: number; zoom: number },
    lookahead: number = 1000, // ms
  ): void {
    // Predict future position based on velocity
    const futureCamera = {
      x: camera.x + velocity.x * lookahead,
      y: camera.y + velocity.y * lookahead,
      zoom: camera.zoom + velocity.zoom * lookahead,
    };

    // Preload around future position
    this.preloadAroundPosition(futureCamera, this.preloadRadius, 0.8);

    // If zooming in significantly, preload higher detail levels
    if (velocity.zoom > 0.1) {
      const higherZoom = Math.max(camera.zoom * 1.5, camera.zoom + 50);
      this.preloadAroundPosition({ ...camera, zoom: higherZoom }, 1, 0.6);
    }
  }

  /**
   * Add a preload request to the queue
   */
  private addToQueue(request: PreloadRequest): void {
    // Check if already in queue or being processed
    const existingIndex = this.preloadQueue.findIndex(
      (req) =>
        req.cellX === request.cellX &&
        req.cellY === request.cellY &&
        Math.abs(req.zoom - request.zoom) < 0.1,
    );

    if (existingIndex >= 0) {
      // Update priority if higher
      if (this.preloadQueue[existingIndex].priority < request.priority) {
        this.preloadQueue[existingIndex] = request;
      }
      return;
    }

    // Add to queue and sort by priority
    this.preloadQueue.push(request);
    this.preloadQueue.sort((a, b) => b.priority - a.priority);

    // Limit queue size
    if (this.preloadQueue.length > 100) {
      this.preloadQueue = this.preloadQueue.slice(0, 100);
    }
  }

  /**
   * Process the preload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.preloadQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const request = this.preloadQueue.shift();
      if (!request) break;

      // Skip old requests
      if (Date.now() - request.timestamp > 10000) {
        continue;
      }

      this.activeRequests++;

      // Process request asynchronously
      starWorkerManager
        .getStarsForCell(request.cellX, request.cellY, request.zoom)
        .then(() => {
          this.activeRequests--;
        })
        .catch((error) => {
          console.warn('Preload failed:', error);
          this.activeRequests--;
        });
    }

    this.isProcessing = false;

    // Continue processing after a short delay
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Clear the preload queue
   */
  clearQueue(): void {
    this.preloadQueue = [];
  }

  /**
   * Get queue status for debugging
   */
  getQueueStatus(): {
    queueSize: number;
    activeRequests: number;
    oldestRequest: number;
  } {
    const now = Date.now();
    const oldestRequest =
      this.preloadQueue.length > 0
        ? now - Math.min(...this.preloadQueue.map((r) => r.timestamp))
        : 0;

    return {
      queueSize: this.preloadQueue.length,
      activeRequests: this.activeRequests,
      oldestRequest,
    };
  }

  /**
   * Adjust preload settings based on performance
   */
  adjustForPerformance(performanceScore: number): void {
    // Reduce preload radius and concurrent requests for lower performance
    if (performanceScore < 0.5) {
      this.preloadRadius = 1;
      this.maxConcurrentRequests = 2;
    } else if (performanceScore < 0.8) {
      this.preloadRadius = 2;
      this.maxConcurrentRequests = 3;
    } else {
      this.preloadRadius = 3;
      this.maxConcurrentRequests = 4;
    }
  }
}

// Singleton instance
export const starPreloader = new StarPreloader();
