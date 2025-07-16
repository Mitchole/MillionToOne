import * as THREE from 'three';
import { StarOctree, Star3D, OctreeNode } from './octree';
import { Camera3D } from '../types';
import { generateStars3D, getOptimalLOD3D } from './starfield3d';
import { getCameraVelocity } from './camera3d';
import { getStarsInChunk, TOTAL_STARS } from './deterministicStars';
import { getStarQualityManager } from './starQualityManager';

interface ChunkLoadingConfig {
  preloadDistance: number; // Distance ahead to preload chunks
  unloadDistance: number; // Distance behind to unload chunks
  maxConcurrentLoads: number; // Maximum concurrent chunk loading operations
  predictiveLoading: boolean; // Enable predictive loading based on camera velocity
  predictionTime: number; // Time ahead to predict camera position (ms)
  memoryLimit: number; // Maximum memory usage in MB
  adaptiveQuality: boolean; // Reduce quality when loading is slow
}

interface ChunkMetadata {
  id: string;
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
  loadState: 'unloaded' | 'loading' | 'loaded' | 'error';
  priority: number;
  lastAccessed: number;
  memoryUsage: number; // Estimated memory usage in bytes
  lodLevel: number;
  starCount: number;
}

interface LoadingTask {
  chunkId: string;
  priority: number;
  bounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
  lodLevel: number;
  promise: Promise<Star3D[]>;
  startTime: number;
}

export class ChunkLoader {
  private config: ChunkLoadingConfig;
  private octree: StarOctree;
  private chunks: Map<string, ChunkMetadata> = new Map();
  private loadingTasks: Map<string, LoadingTask> = new Map();
  private loadingQueue: string[] = [];
  private camera: Camera3D | null = null;
  private cameraHistory: Camera3D[] = [];
  private scene: THREE.Scene;
  private frameCount: number = 0;
  private lastChunkCreationPosition: { x: number; y: number; z: number } | null = null;
  private lastChunkCreationTime: number = 0;
  private chunkCreationThreshold: number = 300; // Create chunks when camera moves 300 units
  private chunkCreationCooldown: number = 250; // Create chunks every 250ms
  private qualityManager = getStarQualityManager();
  private lastQualityCheck: number = 0;
  private performanceMetrics: {
    averageLoadTime: number;
    loadSuccess: number;
    loadErrors: number;
    totalMemoryUsage: number;
    qualityAdjustments: number;
  } = {
    averageLoadTime: 0,
    loadSuccess: 0,
    loadErrors: 0,
    totalMemoryUsage: 0,
    qualityAdjustments: 0,
  };

  constructor(octree: StarOctree, scene: THREE.Scene, config?: Partial<ChunkLoadingConfig>) {
    this.octree = octree;
    this.scene = scene;
    this.config = {
      preloadDistance: 2000,
      unloadDistance: 5000,
      maxConcurrentLoads: 3,
      predictiveLoading: true,
      predictionTime: 2000,
      memoryLimit: 200,
      adaptiveQuality: true,
      ...config,
    };
  }

  /**
   * Check and adjust quality settings based on performance
   */
  private checkQualityAdjustments(): void {
    const now = Date.now();
    if (now - this.lastQualityCheck < 2000) {
      // Check every 2 seconds
      return;
    }

    this.lastQualityCheck = now;

    const stats = this.qualityManager.getPerformanceStats();
    const currentSettings = this.qualityManager.getCurrentSettings();

    // Log performance stats for monitoring
    if (this.frameCount % 300 === 0) {
      // Every 5 seconds at 60fps
      console.log('🎯 ChunkLoader Performance:', {
        fps: Math.round(stats.avgFps),
        memoryUsage: Math.round(stats.memoryUsage),
        chunksLoaded: this.chunks.size,
        loadingTasks: this.loadingTasks.size,
        qualityLevel: stats.quality,
      });
    }

    // Adjust chunk loading parameters based on quality
    this.adjustChunkLoadingParameters(currentSettings);
  }

  /**
   * Adjust chunk loading parameters based on quality settings
   */
  private adjustChunkLoadingParameters(settings: any): void {
    const baseDistance = 2000;
    const baseChunkCount = 3;

    // Adjust based on quality level
    let multiplier = 1.0;
    switch (settings.quality) {
      case 'high':
        multiplier = 1.5;
        break;
      case 'medium':
        multiplier = 1.2;
        break;
      case 'low':
        multiplier = 0.8;
        break;
    }

    // Update config if needed
    const newPreloadDistance = baseDistance * multiplier;
    const newMaxConcurrentLoads = Math.max(1, Math.floor(baseChunkCount * multiplier));

    if (this.config.preloadDistance !== newPreloadDistance) {
      this.config.preloadDistance = newPreloadDistance;
      this.config.maxConcurrentLoads = newMaxConcurrentLoads;
      this.performanceMetrics.qualityAdjustments++;
    }
  }

  /**
   * Update octree with quality-aware settings
   */
  private updateOctreeQuality(camera: Camera3D): void {
    if (!this.octree) return;

    const cameraPosition = new THREE.Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );

    // Force material updates when quality changes
    const currentSettings = this.qualityManager.getCurrentSettings();
    if (this.lastQualityCheck === 0 || !currentSettings.isAutomatic) {
      this.octree.forceUpdateMaterials(cameraPosition);
    }
  }

  /**
   * Get quality-aware chunk size
   */
  private getAdaptiveChunkSize(): number {
    const currentSettings = this.qualityManager.getCurrentSettings();
    const baseSize = 8000;

    switch (currentSettings.quality) {
      case 'high':
        return baseSize * 1.2; // Larger chunks for high quality
      case 'medium':
        return baseSize;
      case 'low':
        return baseSize * 0.8; // Smaller chunks for low quality
      default:
        return baseSize;
    }
  }

  /**
   * Get quality-aware star count for chunk
   */
  private getAdaptiveStarCount(baseCount: number): number {
    const currentSettings = this.qualityManager.getCurrentSettings();

    switch (currentSettings.quality) {
      case 'high':
        return Math.floor(baseCount * 1.5);
      case 'medium':
        return baseCount;
      case 'low':
        return Math.floor(baseCount * 0.7);
      default:
        return baseCount;
    }
  }

  /**
   * Update camera position and trigger chunk loading
   */
  update(camera: Camera3D): void {
    this.camera = camera;
    this.cameraHistory.push(camera);

    // Keep only recent camera history
    if (this.cameraHistory.length > 30) {
      this.cameraHistory.shift();
    }

    // Quality monitoring and adjustment
    this.checkQualityAdjustments();

    // Update octree with quality-aware settings
    this.updateOctreeQuality(camera);

    this.frameCount++;

    // Update chunk priorities and loading queue
    this.updateChunkPriorities();

    // Process loading queue
    this.processLoadingQueue();

    // Unload distant chunks
    this.unloadDistantChunks();

    // Memory management
    if (this.frameCount % 120 === 0) {
      // Every 2 seconds at 60fps
      this.manageMemory();
    }
  }

  /**
   * Update chunk priorities based on camera position and predicted movement
   */
  private updateChunkPriorities(): void {
    if (!this.camera) return;

    // Create temporary camera for LOD calculation
    const tempCamera = new THREE.PerspectiveCamera(
      this.camera.fieldOfView,
      1,
      this.camera.near,
      this.camera.far,
    );
    tempCamera.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z);

    const currentLOD = getOptimalLOD3D(tempCamera);
    const visibleNodes = this.octree.getVisibleNodes();

    // Calculate predicted camera position
    const predictedPosition = this.config.predictiveLoading
      ? this.predictCameraPosition()
      : this.camera.position;

    // Update existing chunks
    this.chunks.forEach((chunk, id) => {
      const distance = this.calculateDistanceToChunk(this.camera!.position, chunk.bounds);
      const predictedDistance = this.calculateDistanceToChunk(predictedPosition, chunk.bounds);

      // Priority based on distance and prediction
      chunk.priority = this.calculatePriority(distance, predictedDistance, currentLOD.level);
    });

    // 🚀 SMART THROTTLING: Allow controlled chunk creation during animation
    // BUT: Always allow initial chunk creation for page load
    const isInitialLoad = this.lastChunkCreationPosition === null;
    if (isInitialLoad || this.shouldCreateNewChunks(this.camera!.position)) {
      this.createChunksAroundCamera(this.camera!.position, currentLOD, predictedPosition);
      this.lastChunkCreationPosition = { ...this.camera!.position };
      this.lastChunkCreationTime = Date.now();

      if (isInitialLoad) {
        console.log('🌌 INITIAL LOAD: Created chunks around camera at page load');
      }
    }

    // Update loading queue after creating new chunks
    this.updateLoadingQueue();

    // Also add chunks for any existing visible nodes
    visibleNodes.forEach((node) => {
      const chunkId = this.generateChunkId(node.bounds);

      if (!this.chunks.has(chunkId)) {
        const distance = this.calculateDistanceToChunk(this.camera!.position, node.bounds);
        const predictedDistance = this.calculateDistanceToChunk(predictedPosition, node.bounds);

        this.chunks.set(chunkId, {
          id: chunkId,
          bounds: {
            min: new THREE.Vector3(node.bounds.min.x, node.bounds.min.y, node.bounds.min.z),
            max: new THREE.Vector3(node.bounds.max.x, node.bounds.max.y, node.bounds.max.z),
          },
          loadState: 'unloaded',
          priority: this.calculatePriority(distance, predictedDistance, currentLOD.level),
          lastAccessed: Date.now(),
          memoryUsage: 0,
          lodLevel: currentLOD.level,
          starCount: 0,
        });
      }
    });

    // Update loading queue
    this.updateLoadingQueue();
  }

  /**
   * Predict camera position based on velocity and history
   */
  private predictCameraPosition(): { x: number; y: number; z: number } {
    if (this.cameraHistory.length < 2) {
      return {
        x: this.camera!.position.x,
        y: this.camera!.position.y,
        z: this.camera!.position.z,
      };
    }

    const current = this.cameraHistory[this.cameraHistory.length - 1];
    const previous = this.cameraHistory[this.cameraHistory.length - 2];

    const velocity = {
      x: current.position.x - previous.position.x,
      y: current.position.y - previous.position.y,
      z: current.position.z - previous.position.z,
    };

    const predictionFactor = this.config.predictionTime / 16; // Assuming 60fps

    return {
      x: current.position.x + velocity.x * predictionFactor,
      y: current.position.y + velocity.y * predictionFactor,
      z: current.position.z + velocity.z * predictionFactor,
    };
  }

  /**
   * 🚨 ANIMATION FIX: Throttle chunk creation to prevent explosion during camera movement
   */
  private shouldCreateNewChunks(cameraPosition: { x: number; y: number; z: number }): boolean {
    const now = Date.now();

    // Check cooldown timer
    if (now - this.lastChunkCreationTime < this.chunkCreationCooldown) {
      return false;
    }

    // Check if camera has moved far enough
    if (this.lastChunkCreationPosition) {
      const distance = Math.sqrt(
        Math.pow(cameraPosition.x - this.lastChunkCreationPosition.x, 2) +
          Math.pow(cameraPosition.y - this.lastChunkCreationPosition.y, 2) +
          Math.pow(cameraPosition.z - this.lastChunkCreationPosition.z, 2),
      );

      if (distance < this.chunkCreationThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * 🚀 GEMINI FIX: Create chunks proactively around camera position
   */
  private createChunksAroundCamera(
    cameraPosition: { x: number; y: number; z: number },
    currentLOD: any,
    predictedPosition: { x: number; y: number; z: number },
  ): void {
    // 🚨 QUALITY-AWARE: Adaptive chunk size based on quality settings
    const chunkSize = this.getAdaptiveChunkSize();
    const maxChunks = Math.max(4, Math.min(12, this.config.maxConcurrentLoads * 2)); // Adaptive chunk count
    let chunksCreated = 0;

    // 🎯 PRIORITY: Create multiple forward chunks for animation path
    // 🌟 VISIBILITY TEST: Create chunks much closer to camera for visibility testing
    const forwardChunks = [
      { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z - 500 }, // Very close to camera
      { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z - 1000 }, // Still close
      { x: cameraPosition.x, y: cameraPosition.y, z: cameraPosition.z - 1500 }, // Moderate distance
    ];

    for (const chunkCenter of forwardChunks) {
      if (chunksCreated >= maxChunks) break;
      const created = this.createSingleChunk(
        chunkCenter,
        chunkSize,
        cameraPosition,
        currentLOD,
        predictedPosition,
      );
      if (created) {
        chunksCreated++;
        console.log(
          '🎯 PRIORITY: Created forward chunk',
          chunksCreated,
          'at z=',
          chunkCenter.z.toFixed(0),
        );

        // Force immediate loading of priority chunks
        const chunkId = this.generateChunkId({
          min: {
            x: chunkCenter.x - chunkSize / 2,
            y: chunkCenter.y - chunkSize / 2,
            z: chunkCenter.z - chunkSize / 2,
          },
          max: {
            x: chunkCenter.x + chunkSize / 2,
            y: chunkCenter.y + chunkSize / 2,
            z: chunkCenter.z + chunkSize / 2,
          },
        });

        console.log('🎯 PRIORITY: Immediately loading chunk', chunkId);
        this.startLoadingChunk(chunkId);
      }
    }

    // Create immediate chunks around camera (3x3x3 = 27 max, but we'll limit to remaining slots)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (chunksCreated >= maxChunks) return; // Safety brake!
          const chunkCenter = {
            x: cameraPosition.x + x * chunkSize,
            y: cameraPosition.y + y * chunkSize,
            z: cameraPosition.z + z * chunkSize,
          };

          const created = this.createSingleChunk(
            chunkCenter,
            chunkSize,
            cameraPosition,
            currentLOD,
            predictedPosition,
          );
          if (created) {
            chunksCreated++;
            console.log('🚨 EMERGENCY: Created chunk', chunksCreated, 'of', maxChunks);
          }
        }
      }
    }
  }

  /**
   * Helper method to create a single chunk
   */
  private createSingleChunk(
    chunkCenter: { x: number; y: number; z: number },
    chunkSize: number,
    cameraPosition: { x: number; y: number; z: number },
    currentLOD: any,
    predictedPosition: { x: number; y: number; z: number },
  ): boolean {
    const chunkBounds = {
      min: new THREE.Vector3(
        chunkCenter.x - chunkSize / 2,
        chunkCenter.y - chunkSize / 2,
        chunkCenter.z - chunkSize / 2,
      ),
      max: new THREE.Vector3(
        chunkCenter.x + chunkSize / 2,
        chunkCenter.y + chunkSize / 2,
        chunkCenter.z + chunkSize / 2,
      ),
    };

    const chunkId = this.generateChunkId(chunkBounds);

    if (!this.chunks.has(chunkId)) {
      const distance = this.calculateDistanceToChunk(cameraPosition, chunkBounds);
      const predictedDistance = this.calculateDistanceToChunk(predictedPosition, chunkBounds);

      this.chunks.set(chunkId, {
        id: chunkId,
        bounds: chunkBounds,
        loadState: 'unloaded',
        priority: this.calculatePriority(distance, predictedDistance, currentLOD.level),
        lastAccessed: Date.now(),
        memoryUsage: 0,
        lodLevel: currentLOD.level,
        starCount: 0,
      });

      return true; // Chunk created
    }

    return false; // Chunk already exists
  }

  /**
   * Calculate chunk priority based on distance and other factors
   */
  private calculatePriority(distance: number, predictedDistance: number, lodLevel: number): number {
    const baseScore = 1000 - distance;
    const predictionBonus = Math.max(0, 500 - predictedDistance);
    const lodBonus = lodLevel * 100;

    return baseScore + predictionBonus + lodBonus;
  }

  /**
   * Update loading queue with prioritized chunks
   */
  private updateLoadingQueue(): void {
    const unloadedChunks = Array.from(this.chunks.values())
      .filter(
        (chunk) =>
          chunk.loadState === 'unloaded' && chunk.priority > 0 && !this.loadingTasks.has(chunk.id),
      )
      .sort((a, b) => b.priority - a.priority);

    this.loadingQueue = unloadedChunks.map((chunk) => chunk.id);
  }

  /**
   * Process loading queue
   */
  private processLoadingQueue(): void {
    const availableSlots = this.config.maxConcurrentLoads - this.loadingTasks.size;

    for (let i = 0; i < Math.min(availableSlots, this.loadingQueue.length); i++) {
      const chunkId = this.loadingQueue.shift()!;
      this.startLoadingChunk(chunkId);
    }
  }

  /**
   * Start loading a chunk
   */
  private async startLoadingChunk(chunkId: string): Promise<void> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk || chunk.loadState !== 'unloaded') return;

    chunk.loadState = 'loading';
    chunk.lastAccessed = Date.now();

    const loadingTask: LoadingTask = {
      chunkId,
      priority: chunk.priority,
      bounds: chunk.bounds,
      lodLevel: chunk.lodLevel,
      promise: this.loadChunkData(chunk),
      startTime: Date.now(),
    };

    this.loadingTasks.set(chunkId, loadingTask);

    try {
      const stars = await loadingTask.promise;
      await this.onChunkLoaded(chunkId, stars);
    } catch (error) {
      this.onChunkLoadError(chunkId, error);
    } finally {
      this.loadingTasks.delete(chunkId);
    }
  }

  /**
   * Load chunk data (generate stars for the chunk)
   */
  private async loadChunkData(chunk: ChunkMetadata): Promise<Star3D[]> {
    return new Promise((resolve, reject) => {
      // Use requestIdleCallback for non-blocking star generation
      const generateStars = () => {
        try {
          const bounds = {
            min: chunk.bounds.min,
            max: chunk.bounds.max,
          };

          // 🌟 DETERMINISTIC STARS: Get exact stars that exist in this chunk
          const deterministicStars = getStarsInChunk(bounds);

          // 🌟 ENHANCED STAR GENERATION: Better sizes, colors, and intensity
          const stars: Star3D[] = deterministicStars.map(({ position, starIndex }) => ({
            id: `star_${starIndex}`,
            position: position,
            color: new THREE.Color(
              `hsl(${200 + Math.random() * 80}, 80%, ${70 + Math.random() * 30}%)`,
            ), // Brighter, more varied colors
            size: Math.random() * 4 + 2, // Size range 2-6 (was 1-3)
            intensity: Math.random() * 0.4 + 0.6, // Intensity range 0.6-1.0 (was 0.5-1.0)
          }));

          console.log(
            `🌟 DETERMINISTIC: Found ${stars.length} stars in chunk (from universe of ${TOTAL_STARS.toLocaleString()})`,
          );

          resolve(stars);
        } catch (error) {
          reject(error);
        }
      };

      // Use requestIdleCallback if available, otherwise use setTimeout
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(generateStars);
      } else {
        setTimeout(generateStars, 0);
      }
    });
  }

  /**
   * Handle successful chunk loading
   */
  private async onChunkLoaded(chunkId: string, stars: Star3D[]): Promise<void> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    // Insert stars into octree
    console.log(
      `🌌 OCTREE INSERT: Inserting ${stars.length} stars into octree for chunk ${chunkId}`,
    );
    stars.forEach((star, index) => {
      this.octree.insert(star);
      if (index < 3) {
        console.log(`🌌 OCTREE INSERT: Star ${index + 1} inserted at`, star.position);
      }
    });
    console.log(`🌌 OCTREE INSERT: All ${stars.length} stars inserted into octree`);

    // Update chunk metadata
    chunk.loadState = 'loaded';
    chunk.starCount = stars.length;
    chunk.memoryUsage = this.estimateMemoryUsage(stars);
    chunk.lastAccessed = Date.now();

    // Debug: Log successful chunk loading
    console.log('🚀 GEMINI: Chunk loaded!', chunkId, 'with', stars.length, 'stars');

    // Update performance metrics
    const loadTime = Date.now() - (this.loadingTasks.get(chunkId)?.startTime || 0);
    this.updatePerformanceMetrics(loadTime, true);

    // Update total memory usage
    this.performanceMetrics.totalMemoryUsage += chunk.memoryUsage;
  }

  /**
   * Handle chunk loading error
   */
  private onChunkLoadError(chunkId: string, error: any): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    chunk.loadState = 'error';
    this.updatePerformanceMetrics(0, false);

    console.warn(`Failed to load chunk ${chunkId}:`, error);
  }

  /**
   * Unload distant chunks to free memory
   */
  private unloadDistantChunks(): void {
    if (!this.camera) return;

    const chunksToUnload: string[] = [];

    this.chunks.forEach((chunk, id) => {
      if (chunk.loadState === 'loaded') {
        const distance = this.calculateDistanceToChunk(this.camera!.position, chunk.bounds);

        if (distance > this.config.unloadDistance) {
          chunksToUnload.push(id);
        }
      }
    });

    chunksToUnload.forEach((chunkId) => {
      this.unloadChunk(chunkId);
    });
  }

  /**
   * Unload a specific chunk
   */
  private unloadChunk(chunkId: string): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk || chunk.loadState !== 'loaded') return;

    // Remove from octree (implementation depends on octree structure)
    // For now, we'll just update the chunk state
    chunk.loadState = 'unloaded';

    // Update memory usage
    this.performanceMetrics.totalMemoryUsage -= chunk.memoryUsage;
    chunk.memoryUsage = 0;
    chunk.starCount = 0;
  }

  /**
   * Manage memory usage
   */
  private manageMemory(): void {
    const memoryUsageMB = this.performanceMetrics.totalMemoryUsage / (1024 * 1024);

    if (memoryUsageMB > this.config.memoryLimit) {
      // Find least recently used chunks to unload
      const sortedChunks = Array.from(this.chunks.values())
        .filter((chunk) => chunk.loadState === 'loaded')
        .sort((a, b) => a.lastAccessed - b.lastAccessed);

      const targetReduction = memoryUsageMB - this.config.memoryLimit * 0.8;
      let currentReduction = 0;

      for (const chunk of sortedChunks) {
        if (currentReduction >= targetReduction) break;

        this.unloadChunk(chunk.id);
        currentReduction += chunk.memoryUsage / (1024 * 1024);
      }
    }
  }

  /**
   * Utility functions
   */
  private calculateDistanceToChunk(
    position: { x: number; y: number; z: number },
    bounds: any,
  ): number {
    const minX = bounds.min.x;
    const minY = bounds.min.y;
    const minZ = bounds.min.z;
    const maxX = bounds.max.x;
    const maxY = bounds.max.y;
    const maxZ = bounds.max.z;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const dx = position.x - centerX;
    const dy = position.y - centerY;
    const dz = position.z - centerZ;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private generateChunkId(bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  }): string {
    const precision = 100; // Round to nearest 100 units
    const minX = Math.floor(bounds.min.x / precision) * precision;
    const minY = Math.floor(bounds.min.y / precision) * precision;
    const minZ = Math.floor(bounds.min.z / precision) * precision;

    return `chunk_${minX}_${minY}_${minZ}`;
  }

  private estimateMemoryUsage(stars: Star3D[]): number {
    // Rough estimate: each star uses about 100 bytes
    return stars.length * 100;
  }

  private isLoadingBehind(): boolean {
    return this.loadingTasks.size >= this.config.maxConcurrentLoads && this.loadingQueue.length > 5;
  }

  private updatePerformanceMetrics(loadTime: number, success: boolean): void {
    if (success) {
      this.performanceMetrics.loadSuccess++;
      this.performanceMetrics.averageLoadTime =
        (this.performanceMetrics.averageLoadTime * (this.performanceMetrics.loadSuccess - 1) +
          loadTime) /
        this.performanceMetrics.loadSuccess;
    } else {
      this.performanceMetrics.loadErrors++;
    }
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    totalChunks: number;
    loadedChunks: number;
    loadingChunks: number;
    queueLength: number;
    memoryUsage: number;
    performance: {
      averageLoadTime: number;
      loadSuccess: number;
      loadErrors: number;
      totalMemoryUsage: number;
    };
  } {
    const loadedChunks = Array.from(this.chunks.values()).filter(
      (chunk) => chunk.loadState === 'loaded',
    ).length;

    return {
      totalChunks: this.chunks.size,
      loadedChunks,
      loadingChunks: this.loadingTasks.size,
      queueLength: this.loadingQueue.length,
      memoryUsage: this.performanceMetrics.totalMemoryUsage / (1024 * 1024),
      performance: this.performanceMetrics,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ChunkLoadingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear all chunks and reset state
   */
  clear(): void {
    this.chunks.clear();
    this.loadingTasks.clear();
    this.loadingQueue = [];
    this.cameraHistory = [];
    this.performanceMetrics = {
      averageLoadTime: 0,
      loadSuccess: 0,
      loadErrors: 0,
      totalMemoryUsage: 0,
      qualityAdjustments: 0,
    };
  }
}

export type { ChunkLoadingConfig, ChunkMetadata, LoadingTask };
