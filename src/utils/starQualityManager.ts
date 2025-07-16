import * as THREE from 'three';
import { DeviceCapabilityDetector } from './performance';
import { StarQuality, StarStyle, StarMaterialFactory } from './starMaterials';
import { getStarTransitionManager } from './starTransitionManager';

export interface QualitySettings {
  quality: StarQuality;
  style: StarStyle;
  isAutomatic: boolean;
  performanceScore: number;
  lastFpsCheck: number;
  fallbackTriggered: boolean;
}

export interface PerformanceThresholds {
  fpsThreshold: number;
  fpsCheckDuration: number; // milliseconds
  memoryThreshold: number; // MB
  fallbackCooldown: number; // milliseconds
}

export class StarQualityManager {
  private static instance: StarQualityManager;
  private currentSettings: QualitySettings;
  private performanceThresholds: PerformanceThresholds;
  private fpsHistory: number[] = [];
  private lastFpsCheckTime: number = 0;
  private fallbackCheckFrames: number = 0;
  private materialFactory: StarMaterialFactory;
  private performanceCheckInterval: number | null = null;
  private lastQualityChange: number = 0;
  private qualityChangeCooldown: number = 1000; // 1 second cooldown

  private constructor() {
    this.materialFactory = StarMaterialFactory.getInstance();

    // Default performance thresholds
    this.performanceThresholds = {
      fpsThreshold: 30,
      fpsCheckDuration: 3000, // 3 seconds
      memoryThreshold: 200, // 200 MB
      fallbackCooldown: 5000, // 5 seconds
    };

    // Initialize with default settings
    this.currentSettings = {
      quality: 'medium',
      style: 'procedural',
      isAutomatic: true,
      performanceScore: 0.5,
      lastFpsCheck: 0,
      fallbackTriggered: false,
    };
  }

  static getInstance(): StarQualityManager {
    if (!StarQualityManager.instance) {
      StarQualityManager.instance = new StarQualityManager();
    }
    return StarQualityManager.instance;
  }

  /**
   * Initialize quality manager with device capabilities
   */
  async initialize(): Promise<void> {
    try {
      const capabilities = await DeviceCapabilityDetector.detect();
      console.log('🎯 StarQualityManager: Device capabilities detected:', capabilities);

      this.currentSettings.performanceScore = capabilities.performanceScore;

      // Set initial quality based on device capabilities
      if (this.currentSettings.isAutomatic) {
        this.currentSettings.quality = this.materialFactory.getOptimalQuality(
          capabilities.performanceScore,
        );

        // Set preferred style based on device capabilities
        if (capabilities.isLowEnd) {
          this.currentSettings.style = 'basic';
        } else if (capabilities.webgl2 && capabilities.performanceScore > 0.7) {
          this.currentSettings.style = 'texture';
        } else {
          this.currentSettings.style = 'procedural';
        }
      }

      console.log('🎯 StarQualityManager: Initial quality settings:', this.currentSettings);

      // Start performance monitoring
      this.startPerformanceMonitoring();
    } catch (error) {
      console.warn('🎯 StarQualityManager: Failed to initialize capabilities:', error);
      // Fallback to low quality
      this.currentSettings.quality = 'low';
      this.currentSettings.style = 'basic';
    }
  }

  /**
   * Start continuous performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
    }

    this.performanceCheckInterval = window.setInterval(() => {
      this.checkPerformanceAndAdjust();
    }, 1000); // Check every second
  }

  /**
   * Stop performance monitoring
   */
  stopPerformanceMonitoring(): void {
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval);
      this.performanceCheckInterval = null;
    }
  }

  /**
   * Record FPS for performance monitoring
   */
  recordFPS(fps: number): void {
    const now = Date.now();
    this.fpsHistory.push(fps);

    // Keep only recent FPS data (last 60 frames)
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    // Check if we need to trigger fallback
    if (this.currentSettings.isAutomatic && !this.currentSettings.fallbackTriggered) {
      this.checkFallbackConditions(fps, now);
    }
  }

  /**
   * Check if fallback conditions are met
   */
  private checkFallbackConditions(currentFps: number, now: number): void {
    if (currentFps < this.performanceThresholds.fpsThreshold) {
      if (this.lastFpsCheckTime === 0) {
        this.lastFpsCheckTime = now;
        this.fallbackCheckFrames = 1;
      } else {
        this.fallbackCheckFrames++;

        // Check if low FPS has persisted for the required duration
        if (now - this.lastFpsCheckTime >= this.performanceThresholds.fpsCheckDuration) {
          console.log('🎯 StarQualityManager: Low FPS detected, triggering fallback');
          this.triggerFallback();
        }
      }
    } else {
      // Reset FPS check if performance improves
      this.lastFpsCheckTime = 0;
      this.fallbackCheckFrames = 0;
    }
  }

  /**
   * Trigger performance fallback
   */
  private triggerFallback(): void {
    if (this.currentSettings.fallbackTriggered) {
      return;
    }

    console.log('🎯 StarQualityManager: Triggering performance fallback');
    this.currentSettings.fallbackTriggered = true;

    // Reduce quality
    const currentQuality = this.currentSettings.quality;
    if (currentQuality === 'high') {
      this.currentSettings.quality = 'medium';
    } else if (currentQuality === 'medium') {
      this.currentSettings.quality = 'low';
    } else {
      // Already at low quality, switch to basic style
      this.currentSettings.style = 'basic';
    }

    console.log('🎯 StarQualityManager: Fallback applied, new settings:', this.currentSettings);

    // Reset fallback flag after cooldown
    setTimeout(() => {
      this.currentSettings.fallbackTriggered = false;
    }, this.performanceThresholds.fallbackCooldown);
  }

  /**
   * Check performance and adjust quality automatically
   */
  private checkPerformanceAndAdjust(): void {
    if (!this.currentSettings.isAutomatic || this.fpsHistory.length < 10) {
      return;
    }

    const avgFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    const memoryUsage = this.materialFactory.getMemoryUsage() / (1024 * 1024); // Convert to MB

    // Check if we can upgrade quality
    if (avgFps > 50 && memoryUsage < this.performanceThresholds.memoryThreshold * 0.7) {
      this.considerQualityUpgrade();
    }

    // Check if we need to downgrade quality
    if (avgFps < 40 || memoryUsage > this.performanceThresholds.memoryThreshold * 0.9) {
      this.considerQualityDowngrade();
    }
  }

  /**
   * Consider upgrading quality if performance allows
   */
  private considerQualityUpgrade(): void {
    if (this.currentSettings.fallbackTriggered) {
      return;
    }

    const currentQuality = this.currentSettings.quality;
    if (currentQuality === 'low' && this.currentSettings.style === 'basic') {
      this.currentSettings.style = 'procedural';
    } else if (currentQuality === 'low') {
      this.currentSettings.quality = 'medium';
    } else if (currentQuality === 'medium') {
      this.currentSettings.quality = 'high';
    }
  }

  /**
   * Consider downgrading quality if performance requires
   */
  private considerQualityDowngrade(): void {
    const currentQuality = this.currentSettings.quality;
    if (currentQuality === 'high') {
      this.currentSettings.quality = 'medium';
    } else if (currentQuality === 'medium') {
      this.currentSettings.quality = 'low';
    } else if (this.currentSettings.style !== 'basic') {
      this.currentSettings.style = 'basic';
    }
  }

  /**
   * Get current quality settings
   */
  getCurrentSettings(): QualitySettings {
    return { ...this.currentSettings };
  }

  /**
   * Set quality manually (disables automatic adjustment)
   */
  setQuality(quality: StarQuality, style: StarStyle = 'procedural'): void {
    const previousQuality = this.currentSettings.quality;
    const previousStyle = this.currentSettings.style;

    // Check if change is needed
    if (previousQuality === quality && previousStyle === style) {
      return;
    }

    // Check cooldown to prevent excessive transitions
    const now = Date.now();
    if (now - this.lastQualityChange < this.qualityChangeCooldown) {
      console.log('🎯 StarQualityManager: Quality change blocked due to cooldown');
      return;
    }

    this.lastQualityChange = now;

    // Start smooth transition
    const transitionManager = getStarTransitionManager();
    transitionManager.startTransition(previousQuality, quality, previousStyle, style);

    // Update settings
    this.currentSettings.quality = quality;
    this.currentSettings.style = style;
    this.currentSettings.isAutomatic = false;
    this.currentSettings.fallbackTriggered = false;

    console.log('🎯 StarQualityManager: Manual quality set with transition:', {
      from: `${previousQuality}-${previousStyle}`,
      to: `${quality}-${style}`,
    });
  }

  /**
   * Enable automatic quality adjustment
   */
  enableAutomatic(): void {
    this.currentSettings.isAutomatic = true;
    this.currentSettings.fallbackTriggered = false;

    // Reset to optimal quality for current performance score
    this.currentSettings.quality = this.materialFactory.getOptimalQuality(
      this.currentSettings.performanceScore,
    );

    console.log('🎯 StarQualityManager: Automatic quality enabled:', this.currentSettings);
  }

  /**
   * Get current star material
   */
  getCurrentMaterial(): THREE.Material {
    return this.materialFactory.createMaterial(
      this.currentSettings.quality,
      this.currentSettings.style,
    );
  }

  /**
   * Update material uniforms
   */
  updateMaterial(material: THREE.Material, time: number, cameraPosition: THREE.Vector3): void {
    this.materialFactory.updateMaterial(material, time, cameraPosition);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    avgFps: number;
    memoryUsage: number;
    quality: StarQuality;
    style: StarStyle;
    isAutomatic: boolean;
    fallbackTriggered: boolean;
  } {
    const avgFps =
      this.fpsHistory.length > 0
        ? this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length
        : 0;

    return {
      avgFps,
      memoryUsage: this.materialFactory.getMemoryUsage() / (1024 * 1024), // MB
      quality: this.currentSettings.quality,
      style: this.currentSettings.style,
      isAutomatic: this.currentSettings.isAutomatic,
      fallbackTriggered: this.currentSettings.fallbackTriggered,
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopPerformanceMonitoring();
    this.materialFactory.dispose();
  }
}

// Export convenience functions
export const getStarQualityManager = (): StarQualityManager => {
  return StarQualityManager.getInstance();
};

export const initializeStarQuality = async (): Promise<void> => {
  await StarQualityManager.getInstance().initialize();
};
