/**
 * Performance monitoring and optimization utilities
 */

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory?: number;
  canvasOperations: number;
}

interface DeviceCapabilities {
  memory: number; // GB
  cores: number;
  gpu: string;
  isLowEnd: boolean;
  isMobile: boolean;
  performanceScore: number; // 0-1
  webgl: boolean;
  webgl2: boolean;
  preferredRenderer: 'threejs' | 'canvas2d';
}

/**
 * Device capability detection for adaptive performance
 */
export class DeviceCapabilityDetector {
  private static capabilities: DeviceCapabilities | null = null;

  static async detect(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    // Detect device memory
    const deviceMemory = (navigator as any).deviceMemory || this.estimateMemory();

    // Detect CPU cores
    const cores = navigator.hardwareConcurrency || 4;

    // Detect GPU
    const gpu = await this.detectGPU();

    // Detect WebGL support
    const webgl = await this.detectWebGL();
    const webgl2 = await this.detectWebGL2();

    // Detect if mobile
    const isMobile = this.isMobileDevice();

    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(
      deviceMemory,
      cores,
      gpu,
      isMobile,
      webgl,
    );

    // Determine if low-end device
    const isLowEnd = performanceScore < 0.4;

    // Determine preferred renderer with more conservative approach
    const preferredRenderer: 'threejs' | 'canvas2d' =
      webgl && !isLowEnd && performanceScore > 0.6 ? 'threejs' : 'canvas2d';

    this.capabilities = {
      memory: deviceMemory,
      cores,
      gpu,
      isLowEnd,
      isMobile,
      performanceScore,
      webgl,
      webgl2,
      preferredRenderer,
    };

    return this.capabilities;
  }

  private static estimateMemory(): number {
    // Fallback memory estimation based on user agent and performance
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 4; // Conservative estimate for iOS devices
    }

    if (userAgent.includes('android')) {
      return 3; // Conservative estimate for Android devices
    }

    return 8; // Default for desktop
  }

  private static async detectGPU(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext);

      if (!gl) {
        return 'unknown';
      }

      let result = 'unknown';

      // Try modern approach first (Firefox compatible)
      try {
        const renderer = gl.getParameter(gl.RENDERER);
        if (renderer && renderer !== 'unknown') {
          result = renderer;
        }
      } catch (e) {
        // Fallback to legacy approach if modern fails
      }

      // Legacy approach for older browsers (check if deprecated extension exists)
      if (result === 'unknown') {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          try {
            result = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
          } catch (e) {
            // Extension exists but deprecated - ignore the warning
          }
        }
      }

      if (result === 'unknown') {
        result = 'webgl-supported';
      }

      // Clean up WebGL context to prevent context limit issues
      if (gl && 'getExtension' in gl && typeof gl.getExtension === 'function') {
        const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
        if (ext) {
          ext.loseContext();
        }
      }

      return result;
    } catch (error) {
      return 'unknown';
    }
  }

  private static async detectWebGL(): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) {
        return false;
      }

      // Clean up WebGL context to prevent context limit issues
      if (gl && 'getExtension' in gl && typeof gl.getExtension === 'function') {
        const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
        if (ext) {
          ext.loseContext();
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private static async detectWebGL2(): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');

      if (!gl) {
        return false;
      }

      // Clean up WebGL context to prevent context limit issues
      if (gl && 'getExtension' in gl && typeof gl.getExtension === 'function') {
        const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
        if (ext) {
          ext.loseContext();
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  private static calculatePerformanceScore(
    memory: number,
    cores: number,
    gpu: string,
    isMobile: boolean,
    webgl: boolean,
  ): number {
    let score = 0;

    // Memory score (25% weight)
    if (memory >= 8) score += 0.25;
    else if (memory >= 4) score += 0.18;
    else if (memory >= 2) score += 0.1;

    // CPU score (20% weight)
    if (cores >= 8) score += 0.2;
    else if (cores >= 4) score += 0.16;
    else if (cores >= 2) score += 0.12;
    else score += 0.08;

    // GPU score (25% weight)
    if (gpu.toLowerCase().includes('nvidia') || gpu.toLowerCase().includes('amd')) {
      score += 0.25;
    } else if (gpu.toLowerCase().includes('intel')) {
      score += 0.15;
    } else if (gpu !== 'unknown') {
      score += 0.1;
    }

    // WebGL support (15% weight)
    if (webgl) {
      score += 0.15;
    }

    // Platform modifier (15% weight)
    if (isMobile) {
      score += 0.08; // Mobile devices get reduced score
    } else {
      score += 0.15; // Desktop gets full score
    }

    return Math.min(score, 1.0);
  }

  static getCapabilities(): DeviceCapabilities | null {
    return this.capabilities;
  }

  static isLowEndDevice(): boolean {
    return this.capabilities?.isLowEnd || false;
  }

  static isMobile(): boolean {
    return this.capabilities?.isMobile || false;
  }

  static getPerformanceScore(): number {
    return this.capabilities?.performanceScore || 0.5;
  }

  static supportsWebGL(): boolean {
    return this.capabilities?.webgl || false;
  }

  static supportsWebGL2(): boolean {
    return this.capabilities?.webgl2 || false;
  }

  static getPreferredRenderer(): 'threejs' | 'canvas2d' {
    return this.capabilities?.preferredRenderer || 'canvas2d';
  }
}

class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private frameTime = 0;
  private fps = 0;
  private canvasOperations = 0;
  private isMonitoring = false;

  start() {
    this.isMonitoring = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.requestFrame();
  }

  stop() {
    this.isMonitoring = false;
  }

  private requestFrame = () => {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    this.frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.frameCount++;

    // Calculate FPS every 60 frames
    if (this.frameCount % 60 === 0) {
      this.fps = Math.round(1000 / this.frameTime);
    }

    requestAnimationFrame(this.requestFrame);
  };

  incrementCanvasOperation() {
    this.canvasOperations++;
  }

  getMetrics(): PerformanceMetrics {
    const memory = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / 1024 / 1024
      : undefined;

    return {
      fps: this.fps,
      frameTime: this.frameTime,
      memory,
      canvasOperations: this.canvasOperations,
    };
  }

  reset() {
    this.frameCount = 0;
    this.canvasOperations = 0;
    this.fps = 0;
    this.frameTime = 0;
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Canvas optimization utilities
 */
export class CanvasOptimizer {
  private static offscreenCanvas: HTMLCanvasElement | null = null;
  private static offscreenCtx: CanvasRenderingContext2D | null = null;

  static createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }

    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;

    return this.offscreenCanvas;
  }

  static getOffscreenContext(): CanvasRenderingContext2D | null {
    return this.offscreenCtx;
  }

  static optimizeContext(ctx: CanvasRenderingContext2D) {
    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Set common defaults
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  static batchDrawCalls(ctx: CanvasRenderingContext2D, calls: (() => void)[]) {
    ctx.save();
    calls.forEach((call) => call());
    ctx.restore();
  }

  static clearRect(ctx: CanvasRenderingContext2D, width: number, height: number) {
    // Use clearRect instead of fillRect for better performance
    ctx.clearRect(0, 0, width, height);
  }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static cacheSize = 0;
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

  static addToCache(size: number) {
    this.cacheSize += size;

    if (this.cacheSize > this.MAX_CACHE_SIZE) {
      this.clearCache();
    }
  }

  static clearCache() {
    this.cacheSize = 0;
    // Trigger garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  static getCacheSize(): number {
    return this.cacheSize;
  }
}

/**
 * Animation frame throttling
 */
export class FrameThrottler {
  private static targetFPS = 60;
  private static frameInterval = 1000 / this.targetFPS;
  private static lastFrameTime = 0;

  static setTargetFPS(fps: number) {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
  }

  static shouldRender(currentTime: number): boolean {
    if (currentTime - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = currentTime;
      return true;
    }
    return false;
  }
}

/**
 * Visibility API integration
 */
export class VisibilityManager {
  private static isVisible = true;
  private static listeners: Array<(visible: boolean) => void> = [];

  static init() {
    document.addEventListener('visibilitychange', () => {
      this.isVisible = !document.hidden;
      this.listeners.forEach((listener) => listener(this.isVisible));
    });
  }

  static addListener(listener: (visible: boolean) => void) {
    this.listeners.push(listener);
  }

  static removeListener(listener: (visible: boolean) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  static isPageVisible(): boolean {
    return this.isVisible;
  }
}

/**
 * Development performance helpers
 */
export const devPerformance = {
  logMetrics: () => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      const metrics = performanceMonitor.getMetrics();
      console.log('Performance Metrics:', {
        fps: metrics.fps,
        frameTime: `${metrics.frameTime.toFixed(2)}ms`,
        memory: metrics.memory ? `${metrics.memory.toFixed(2)}MB` : 'N/A',
        canvasOperations: metrics.canvasOperations,
      });
    }
  },

  measureFunction: <T>(name: string, fn: () => T): T => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      console.log(`${name}: ${(end - start).toFixed(2)}ms`);
      return result;
    }
    return fn();
  },

  profileCanvas: (ctx: CanvasRenderingContext2D, name: string) => {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      const originalClearRect = ctx.clearRect.bind(ctx);
      const originalFillRect = ctx.fillRect.bind(ctx);
      const originalStroke = ctx.stroke.bind(ctx);
      const originalFill = ctx.fill.bind(ctx);

      let operations = 0;

      ctx.clearRect = (...args: Parameters<typeof originalClearRect>) => {
        operations++;
        return originalClearRect(...args);
      };

      ctx.fillRect = (...args: Parameters<typeof originalFillRect>) => {
        operations++;
        return originalFillRect(...args);
      };

      ctx.stroke = ((path?: Path2D) => {
        operations++;
        return originalStroke(path as any);
      }) as typeof originalStroke;

      ctx.fill = ((fillRule?: CanvasFillRule, path?: Path2D) => {
        operations++;
        return originalFill(fillRule as any, path as any);
      }) as typeof originalFill;

      // Log operations every second
      const interval = setInterval(() => {
        console.log(`${name} operations/sec:`, operations);
        operations = 0;
      }, 1000);

      return () => {
        clearInterval(interval);
        ctx.clearRect = originalClearRect;
        ctx.fillRect = originalFillRect;
        ctx.stroke = originalStroke;
        ctx.fill = originalFill;
      };
    }
    return () => {};
  },
};

// Initialize visibility manager
VisibilityManager.init();
