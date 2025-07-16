import * as THREE from 'three';
import { StarQuality, StarStyle } from './starMaterials';
import { getStarQualityManager } from './starQualityManager';

export interface TransitionConfig {
  duration: number; // milliseconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  enableSmoothTransitions: boolean;
}

export interface TransitionState {
  isTransitioning: boolean;
  progress: number; // 0 to 1
  fromQuality: StarQuality;
  toQuality: StarQuality;
  fromStyle: StarStyle;
  toStyle: StarStyle;
  startTime: number;
  duration: number;
}

export class StarTransitionManager {
  private static instance: StarTransitionManager;
  private config: TransitionConfig;
  private currentTransition: TransitionState | null = null;
  private animationFrameId: number | null = null;
  private qualityManager = getStarQualityManager();
  private transitionCallbacks: ((state: TransitionState) => void)[] = [];
  private completionCallbacks: (() => void)[] = [];

  private constructor() {
    this.config = {
      duration: 800, // 800ms transition
      easing: 'ease-in-out',
      enableSmoothTransitions: true,
    };
  }

  static getInstance(): StarTransitionManager {
    if (!StarTransitionManager.instance) {
      StarTransitionManager.instance = new StarTransitionManager();
    }
    return StarTransitionManager.instance;
  }

  /**
   * Start a transition between quality levels
   */
  startTransition(
    fromQuality: StarQuality,
    toQuality: StarQuality,
    fromStyle: StarStyle,
    toStyle: StarStyle,
  ): void {
    // If transitions are disabled, apply change immediately
    if (!this.config.enableSmoothTransitions) {
      this.qualityManager.setQuality(toQuality, toStyle);
      return;
    }

    // If same quality and style, no transition needed
    if (fromQuality === toQuality && fromStyle === toStyle) {
      return;
    }

    // Cancel existing transition
    this.cancelTransition();

    // Start new transition
    this.currentTransition = {
      isTransitioning: true,
      progress: 0,
      fromQuality,
      toQuality,
      fromStyle,
      toStyle,
      startTime: Date.now(),
      duration: this.config.duration,
    };

    console.log('🎬 StarTransitionManager: Starting transition', {
      from: `${fromQuality}-${fromStyle}`,
      to: `${toQuality}-${toStyle}`,
      duration: this.config.duration,
    });

    // Start animation loop
    this.animate();
  }

  /**
   * Cancel current transition
   */
  cancelTransition(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.currentTransition = null;
  }

  /**
   * Animation loop for smooth transitions
   */
  private animate(): void {
    if (!this.currentTransition) return;

    const now = Date.now();
    const elapsed = now - this.currentTransition.startTime;
    const rawProgress = Math.min(elapsed / this.currentTransition.duration, 1);

    // Apply easing
    this.currentTransition.progress = this.applyEasing(rawProgress);

    // Notify callbacks
    this.notifyTransitionCallbacks(this.currentTransition);

    // Apply intermediate quality settings
    this.applyTransitionState(this.currentTransition);

    // Check if transition is complete
    if (rawProgress >= 1) {
      this.completeTransition();
    } else {
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    }
  }

  /**
   * Apply easing function to progress
   */
  private applyEasing(progress: number): number {
    switch (this.config.easing) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      default:
        return progress;
    }
  }

  /**
   * Apply transition state to materials
   */
  private applyTransitionState(state: TransitionState): void {
    // For smooth transitions, we can blend between materials
    // or gradually update shader uniforms

    // For now, we'll use a threshold-based approach
    // where we switch materials at the halfway point
    if (state.progress < 0.5) {
      // Use source material with reduced intensity
      this.qualityManager.setQuality(state.fromQuality, state.fromStyle);
    } else {
      // Use target material with increasing intensity
      this.qualityManager.setQuality(state.toQuality, state.toStyle);
    }
  }

  /**
   * Complete the transition
   */
  private completeTransition(): void {
    if (!this.currentTransition) return;

    // Apply final quality settings
    this.qualityManager.setQuality(
      this.currentTransition.toQuality,
      this.currentTransition.toStyle,
    );

    console.log('✅ StarTransitionManager: Transition complete', {
      final: `${this.currentTransition.toQuality}-${this.currentTransition.toStyle}`,
    });

    // Notify completion callbacks
    this.notifyCompletionCallbacks();

    // Clean up
    this.currentTransition = null;
    this.animationFrameId = null;
  }

  /**
   * Get current transition state
   */
  getCurrentTransition(): TransitionState | null {
    return this.currentTransition ? { ...this.currentTransition } : null;
  }

  /**
   * Check if currently transitioning
   */
  isTransitioning(): boolean {
    return this.currentTransition !== null;
  }

  /**
   * Update transition configuration
   */
  updateConfig(config: Partial<TransitionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): TransitionConfig {
    return { ...this.config };
  }

  /**
   * Add callback for transition updates
   */
  addTransitionCallback(callback: (state: TransitionState) => void): void {
    this.transitionCallbacks.push(callback);
  }

  /**
   * Remove transition callback
   */
  removeTransitionCallback(callback: (state: TransitionState) => void): void {
    const index = this.transitionCallbacks.indexOf(callback);
    if (index > -1) {
      this.transitionCallbacks.splice(index, 1);
    }
  }

  /**
   * Add callback for transition completion
   */
  addCompletionCallback(callback: () => void): void {
    this.completionCallbacks.push(callback);
  }

  /**
   * Remove completion callback
   */
  removeCompletionCallback(callback: () => void): void {
    const index = this.completionCallbacks.indexOf(callback);
    if (index > -1) {
      this.completionCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify transition callbacks
   */
  private notifyTransitionCallbacks(state: TransitionState): void {
    for (const callback of this.transitionCallbacks) {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in transition callback:', error);
      }
    }
  }

  /**
   * Notify completion callbacks
   */
  private notifyCompletionCallbacks(): void {
    for (const callback of this.completionCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Error in completion callback:', error);
      }
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.cancelTransition();
    this.transitionCallbacks.length = 0;
    this.completionCallbacks.length = 0;
  }
}

// Export convenience functions
export const getStarTransitionManager = (): StarTransitionManager => {
  return StarTransitionManager.getInstance();
};

export const startStarTransition = (
  fromQuality: StarQuality,
  toQuality: StarQuality,
  fromStyle: StarStyle,
  toStyle: StarStyle,
): void => {
  StarTransitionManager.getInstance().startTransition(fromQuality, toQuality, fromStyle, toStyle);
};
