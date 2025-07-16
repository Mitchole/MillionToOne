import * as THREE from 'three';

// Import shader source files
import lensFlareVertexShader from '@/shaders/lensFlare.vert?raw';
import lensFlareFragmentShader from '@/shaders/lensFlare.frag?raw';

export type StarQuality = 'low' | 'medium' | 'high';
export type StarStyle = 'basic' | 'procedural' | 'texture';

export interface StarMaterialConfig {
  quality: StarQuality;
  style: StarStyle;
  globalScale: number;
  intensity: number;
  useTexture: boolean;
  lensFlareTexture?: THREE.Texture;
}

export interface StarMaterialOptions {
  size: number;
  sizeAttenuation: boolean;
  vertexColors: boolean;
  transparent: boolean;
  alphaTest: number;
  blending: THREE.Blending;
}

export class StarMaterialFactory {
  private static instance: StarMaterialFactory;
  private materialCache: Map<string, THREE.Material> = new Map();
  private lensFlareTexture: THREE.Texture | null = null;
  private textureLoader: THREE.TextureLoader;

  private constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  static getInstance(): StarMaterialFactory {
    if (!StarMaterialFactory.instance) {
      StarMaterialFactory.instance = new StarMaterialFactory();
    }
    return StarMaterialFactory.instance;
  }

  /**
   * Create lens flare texture atlas (512KB as specified)
   */
  private createLensFlareTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Create gradient-based lens flare texture
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Add lens flare spikes
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;

    // Draw cross pattern for lens flare spikes
    ctx.beginPath();
    ctx.moveTo(256, 50);
    ctx.lineTo(256, 462);
    ctx.moveTo(50, 256);
    ctx.lineTo(462, 256);
    ctx.stroke();

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;

    return texture;
  }

  /**
   * Get or create lens flare texture
   */
  private getLensFlareTexture(): THREE.Texture {
    if (!this.lensFlareTexture) {
      this.lensFlareTexture = this.createLensFlareTexture();
    }
    return this.lensFlareTexture;
  }

  /**
   * Create basic PointsMaterial (fallback)
   */
  private createBasicMaterial(options: StarMaterialOptions): THREE.PointsMaterial {
    return new THREE.PointsMaterial({
      size: options.size,
      sizeAttenuation: options.sizeAttenuation,
      vertexColors: options.vertexColors,
      transparent: options.transparent,
      alphaTest: options.alphaTest,
      blending: options.blending,
    });
  }

  /**
   * Create ShaderMaterial with lens flare effects
   */
  private createLensFlareMaterial(
    config: StarMaterialConfig,
    options: StarMaterialOptions,
  ): THREE.ShaderMaterial {
    const uniforms = {
      time: { value: 0 },
      globalScale: { value: config.globalScale },
      intensity: { value: config.intensity },
      useTexture: { value: config.useTexture },
      lensFlareTexture: { value: config.useTexture ? this.getLensFlareTexture() : null },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      cameraPosition: { value: new THREE.Vector3() },
    };

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: lensFlareVertexShader,
      fragmentShader: lensFlareFragmentShader,
      transparent: options.transparent,
      alphaTest: options.alphaTest,
      blending: options.blending,
      vertexColors: options.vertexColors,
    });
  }

  /**
   * Get performance-optimized material configuration
   */
  private getQualityConfig(quality: StarQuality, style: StarStyle): StarMaterialConfig {
    const configs: Record<StarQuality, StarMaterialConfig> = {
      low: {
        quality: 'low',
        style: 'basic',
        globalScale: 1.0,
        intensity: 0.8,
        useTexture: false,
      },
      medium: {
        quality: 'medium',
        style: style === 'texture' ? 'texture' : 'procedural',
        globalScale: 2.5,
        intensity: 1.8,
        useTexture: style === 'texture',
      },
      high: {
        quality: 'high',
        style: style === 'texture' ? 'texture' : 'procedural',
        globalScale: 1.5,
        intensity: 1.2,
        useTexture: style === 'texture',
      },
    };

    return configs[quality];
  }

  /**
   * Get default material options
   */
  private getDefaultOptions(): StarMaterialOptions {
    return {
      size: 400,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      alphaTest: 0.1,
      blending: THREE.AdditiveBlending,
    };
  }

  /**
   * Create star material based on quality and style
   */
  createMaterial(quality: StarQuality, style: StarStyle = 'procedural'): THREE.Material {
    const cacheKey = `${quality}-${style}`;

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const config = this.getQualityConfig(quality, style);
    const options = this.getDefaultOptions();

    let material: THREE.Material;

    if (config.style === 'basic') {
      material = this.createBasicMaterial(options);
    } else {
      material = this.createLensFlareMaterial(config, options);
    }

    this.materialCache.set(cacheKey, material);
    return material;
  }

  /**
   * Update material uniforms (for shader materials)
   */
  updateMaterial(material: THREE.Material, time: number, cameraPosition: THREE.Vector3): void {
    if (material instanceof THREE.ShaderMaterial) {
      material.uniforms.time.value = time;
      material.uniforms.cameraPosition.value.copy(cameraPosition);
      material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * Get optimal quality based on performance score
   */
  getOptimalQuality(performanceScore: number): StarQuality {
    if (performanceScore > 0.8) return 'high';
    if (performanceScore > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Clear material cache
   */
  clearCache(): void {
    this.materialCache.forEach((material) => {
      if (material instanceof THREE.ShaderMaterial) {
        material.dispose();
      } else if (material instanceof THREE.PointsMaterial) {
        material.dispose();
      }
    });
    this.materialCache.clear();
  }

  /**
   * Get memory usage estimate
   */
  getMemoryUsage(): number {
    let totalMemory = 0;

    // Texture memory (if loaded)
    if (this.lensFlareTexture) {
      totalMemory += 512 * 1024; // 512KB texture atlas
    }

    // Material memory (rough estimate)
    totalMemory += this.materialCache.size * 1024; // 1KB per cached material

    return totalMemory;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.clearCache();

    if (this.lensFlareTexture) {
      this.lensFlareTexture.dispose();
      this.lensFlareTexture = null;
    }
  }
}

// Export convenience functions
export const createStarMaterial = (
  quality: StarQuality,
  style: StarStyle = 'procedural',
): THREE.Material => {
  return StarMaterialFactory.getInstance().createMaterial(quality, style);
};

export const updateStarMaterial = (
  material: THREE.Material,
  time: number,
  cameraPosition: THREE.Vector3,
): void => {
  StarMaterialFactory.getInstance().updateMaterial(material, time, cameraPosition);
};

export const getOptimalStarQuality = (performanceScore: number): StarQuality => {
  return StarMaterialFactory.getInstance().getOptimalQuality(performanceScore);
};
