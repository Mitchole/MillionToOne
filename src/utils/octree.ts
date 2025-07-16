import * as THREE from 'three';
import { getStarQualityManager } from './starQualityManager';

interface BoundingBox3D {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

interface Star3D {
  id: string;
  position: THREE.Vector3;
  color: THREE.Color;
  size: number;
  intensity: number;
}

interface OctreeNode {
  bounds: BoundingBox3D;
  stars: Star3D[];
  children: OctreeNode[] | null;
  level: number;
  starCount: number;
  mesh?: THREE.Points;
  distanceToCamera?: number;
  lodLevel?: number;
  lastMaterialUpdate?: number;
  materialHash?: string;
}

interface OctreeConfig {
  bounds: BoundingBox3D;
  maxStarsPerNode: number;
  maxDepth: number;
}

export class StarOctree {
  private root: OctreeNode;
  private config: OctreeConfig;
  private loadedNodes: Set<string> = new Set();
  private visibleNodes: Set<OctreeNode> = new Set();
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private qualityManager = getStarQualityManager();
  private materialUpdateInterval = 1000; // Update materials every second
  private lastPerformanceCheck = 0;

  constructor(config: OctreeConfig) {
    this.config = config;
    this.root = this.createNode(config.bounds, 0);
  }

  private createNode(bounds: BoundingBox3D, level: number): OctreeNode {
    return {
      bounds,
      stars: [],
      children: null,
      level,
      starCount: 0,
    };
  }

  private subdivide(node: OctreeNode): void {
    if (node.children || node.level >= this.config.maxDepth) return;

    const { bounds } = node;
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const centerY = (bounds.min.y + bounds.max.y) / 2;
    const centerZ = (bounds.min.z + bounds.max.z) / 2;

    node.children = [
      // Bottom level
      this.createNode(
        {
          min: { x: bounds.min.x, y: bounds.min.y, z: bounds.min.z },
          max: { x: centerX, y: centerY, z: centerZ },
        },
        node.level + 1,
      ),
      this.createNode(
        {
          min: { x: centerX, y: bounds.min.y, z: bounds.min.z },
          max: { x: bounds.max.x, y: centerY, z: centerZ },
        },
        node.level + 1,
      ),
      this.createNode(
        {
          min: { x: bounds.min.x, y: centerY, z: bounds.min.z },
          max: { x: centerX, y: bounds.max.y, z: centerZ },
        },
        node.level + 1,
      ),
      this.createNode(
        {
          min: { x: centerX, y: centerY, z: bounds.min.z },
          max: { x: bounds.max.x, y: bounds.max.y, z: centerZ },
        },
        node.level + 1,
      ),
      // Top level
      this.createNode(
        {
          min: { x: bounds.min.x, y: bounds.min.y, z: centerZ },
          max: { x: centerX, y: centerY, z: bounds.max.z },
        },
        node.level + 1,
      ),
      this.createNode(
        {
          min: { x: centerX, y: bounds.min.y, z: centerZ },
          max: { x: bounds.max.x, y: centerY, z: bounds.max.z },
        },
        node.level + 1,
      ),
      this.createNode(
        {
          min: { x: bounds.min.x, y: centerY, z: centerZ },
          max: { x: centerX, y: bounds.max.y, z: bounds.max.z },
        },
        node.level + 1,
      ),
      this.createNode(
        {
          min: { x: centerX, y: centerY, z: centerZ },
          max: { x: bounds.max.x, y: bounds.max.y, z: bounds.max.z },
        },
        node.level + 1,
      ),
    ];
  }

  private pointInBounds(point: THREE.Vector3, bounds: BoundingBox3D): boolean {
    return (
      point.x >= bounds.min.x &&
      point.x <= bounds.max.x &&
      point.y >= bounds.min.y &&
      point.y <= bounds.max.y &&
      point.z >= bounds.min.z &&
      point.z <= bounds.max.z
    );
  }

  insert(star: Star3D): void {
    this.insertRecursive(this.root, star);
  }

  private insertRecursive(node: OctreeNode, star: Star3D): void {
    if (!this.pointInBounds(star.position, node.bounds)) {
      return;
    }

    if (node.children === null) {
      node.stars.push(star);
      node.starCount++;

      if (node.stars.length > this.config.maxStarsPerNode && node.level < this.config.maxDepth) {
        this.subdivide(node);

        // Redistribute stars to children
        const starsToMove = [...node.stars];
        node.stars = [];
        node.starCount = 0;

        for (const starToMove of starsToMove) {
          this.insertRecursive(node, starToMove);
        }
      }
    } else {
      // Insert into appropriate child
      for (const child of node.children) {
        if (this.pointInBounds(star.position, child.bounds)) {
          this.insertRecursive(child, star);
          break;
        }
      }
      node.starCount++;
    }
  }

  private ensureNodeMesh(node: OctreeNode): void {
    if (node.mesh || node.stars.length === 0) {
      return;
    }

    try {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(node.stars.length * 3);
      const colors = new Float32Array(node.stars.length * 3);
      const sizes = new Float32Array(node.stars.length);

      for (let i = 0; i < node.stars.length; i++) {
        const star = node.stars[i];
        const i3 = i * 3;

        positions[i3] = star.position.x;
        positions[i3 + 1] = star.position.y;
        positions[i3 + 2] = star.position.z;

        colors[i3] = star.color.r;
        colors[i3 + 1] = star.color.g;
        colors[i3 + 2] = star.color.b;

        sizes[i] = star.size;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      // Use StarQualityManager for adaptive material selection
      const qualityManager = getStarQualityManager();
      const material = qualityManager.getCurrentMaterial();

      node.mesh = new THREE.Points(geometry, material);
    } catch (error) {
      console.error('❌ MESH: Error creating mesh:', error);
    }
  }

  getVisibleNodes(): Set<OctreeNode> {
    return this.visibleNodes;
  }

  getStarsInFrustum(camera: THREE.PerspectiveCamera): Star3D[] {
    this.updateVisibility(camera);
    const stars: Star3D[] = [];

    for (const node of this.visibleNodes) {
      stars.push(...node.stars);
    }

    return stars;
  }

  clear(): void {
    this.clearNode(this.root);
    this.loadedNodes.clear();
    this.visibleNodes.clear();
  }

  private clearNode(node: OctreeNode): void {
    if (node.mesh) {
      node.mesh.geometry.dispose();
      if (Array.isArray(node.mesh.material)) {
        node.mesh.material.forEach((material) => material.dispose());
      } else {
        node.mesh.material.dispose();
      }
    }

    if (node.children) {
      for (const child of node.children) {
        this.clearNode(child);
      }
    }
  }

  /**
   * Calculate LOD level based on distance and quality settings
   */
  private calculateLODLevel(node: OctreeNode, cameraPosition: THREE.Vector3): number {
    const currentSettings = this.qualityManager.getCurrentSettings();
    const distance = node.distanceToCamera || 0;

    // Base LOD thresholds
    const baseLODThresholds = [500, 2000, 8000, 20000]; // Close, Medium, Far, Very Far

    // Adjust thresholds based on quality setting
    const qualityMultiplier =
      currentSettings.quality === 'high' ? 1.5 : currentSettings.quality === 'medium' ? 1.2 : 0.8;

    for (let i = 0; i < baseLODThresholds.length; i++) {
      if (distance < baseLODThresholds[i] * qualityMultiplier) {
        return i;
      }
    }

    return baseLODThresholds.length; // Maximum LOD level
  }

  /**
   * Calculate distance from camera to node center
   */
  private calculateNodeDistance(node: OctreeNode, cameraPosition: THREE.Vector3): number {
    const centerX = (node.bounds.min.x + node.bounds.max.x) / 2;
    const centerY = (node.bounds.min.y + node.bounds.max.y) / 2;
    const centerZ = (node.bounds.min.z + node.bounds.max.z) / 2;

    return Math.sqrt(
      Math.pow(centerX - cameraPosition.x, 2) +
        Math.pow(centerY - cameraPosition.y, 2) +
        Math.pow(centerZ - cameraPosition.z, 2),
    );
  }

  /**
   * Generate material hash for caching
   */
  private generateMaterialHash(lodLevel: number): string {
    const settings = this.qualityManager.getCurrentSettings();
    return `${settings.quality}-${settings.style}-${lodLevel}`;
  }

  /**
   * Check if node material needs updating
   */
  private shouldUpdateMaterial(node: OctreeNode, currentHash: string): boolean {
    if (!node.materialHash || node.materialHash !== currentHash) {
      return true;
    }

    const now = Date.now();
    if (!node.lastMaterialUpdate || now - node.lastMaterialUpdate > this.materialUpdateInterval) {
      return true;
    }

    return false;
  }

  /**
   * Update node material based on LOD and quality
   */
  private updateNodeMaterial(node: OctreeNode, cameraPosition: THREE.Vector3): void {
    const lodLevel = this.calculateLODLevel(node, cameraPosition);
    const materialHash = this.generateMaterialHash(lodLevel);

    if (!this.shouldUpdateMaterial(node, materialHash)) {
      return;
    }

    if (node.mesh) {
      // Update existing material
      const newMaterial = this.qualityManager.getCurrentMaterial();

      // Dispose old material if it's not cached
      if (node.mesh.material && !Array.isArray(node.mesh.material)) {
        // Don't dispose cached materials from the factory
        // node.mesh.material.dispose();
      }

      node.mesh.material = newMaterial;
      node.materialHash = materialHash;
      node.lastMaterialUpdate = Date.now();
      node.lodLevel = lodLevel;
    }
  }

  /**
   * Enhanced visibility update with quality-aware rendering
   */
  updateVisibility(camera: THREE.PerspectiveCamera): void {
    this.visibleNodes.clear();
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    const now = Date.now();
    const checkPerformance = now - this.lastPerformanceCheck > 5000; // Every 5 seconds

    if (checkPerformance) {
      this.lastPerformanceCheck = now;
      const stats = this.qualityManager.getPerformanceStats();

      // Log performance statistics
      console.log('🎯 Octree Performance Stats:', {
        fps: Math.round(stats.avgFps),
        memoryUsage: Math.round(stats.memoryUsage),
        quality: stats.quality,
        style: stats.style,
        visibleNodes: this.visibleNodes.size,
      });
    }

    this.traverseVisibility(this.root, camera.position);
  }

  /**
   * Enhanced traversal with LOD and quality awareness
   */
  private traverseVisibility(node: OctreeNode, cameraPosition: THREE.Vector3): void {
    // Calculate distance to camera
    node.distanceToCamera = this.calculateNodeDistance(node, cameraPosition);

    // Check if node is in frustum
    const box = new THREE.Box3(
      new THREE.Vector3(node.bounds.min.x, node.bounds.min.y, node.bounds.min.z),
      new THREE.Vector3(node.bounds.max.x, node.bounds.max.y, node.bounds.max.z),
    );

    if (!this.frustum.intersectsBox(box)) {
      return;
    }

    // Calculate LOD level
    const lodLevel = this.calculateLODLevel(node, cameraPosition);
    node.lodLevel = lodLevel;

    // Skip very distant nodes based on quality settings
    const currentSettings = this.qualityManager.getCurrentSettings();
    const maxDistance =
      currentSettings.quality === 'high'
        ? 500000
        : currentSettings.quality === 'medium'
          ? 300000
          : 150000;

    if (node.distanceToCamera > maxDistance) {
      return;
    }

    // For nodes with stars (leaf or parent), create/update mesh
    if (node.stars.length > 0) {
      this.ensureNodeMesh(node);
      this.updateNodeMaterial(node, cameraPosition);
      this.visibleNodes.add(node);
    }

    // Traverse children
    if (node.children) {
      for (const child of node.children) {
        this.traverseVisibility(child, cameraPosition);
      }
    }
  }

  // Get statistics for debugging
  getStats(): {
    totalNodes: number;
    leafNodes: number;
    totalStars: number;
    visibleNodes: number;
    maxDepth: number;
    lodDistribution: { [key: number]: number };
    memoryUsage: number;
    materialUpdates: number;
  } {
    let totalNodes = 0;
    let leafNodes = 0;
    let totalStars = 0;
    let maxDepth = 0;
    let materialUpdates = 0;
    const lodDistribution: { [key: number]: number } = {};

    const traverse = (node: OctreeNode) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, node.level);

      if (node.lodLevel !== undefined) {
        lodDistribution[node.lodLevel] = (lodDistribution[node.lodLevel] || 0) + 1;
      }

      if (node.lastMaterialUpdate) {
        materialUpdates++;
      }

      if (node.children === null) {
        leafNodes++;
        totalStars += node.stars.length;
      } else {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(this.root);

    return {
      totalNodes,
      leafNodes,
      totalStars,
      visibleNodes: this.visibleNodes.size,
      maxDepth,
      lodDistribution,
      memoryUsage: this.qualityManager.getPerformanceStats().memoryUsage,
      materialUpdates,
    };
  }

  /**
   * Force material update for all nodes
   */
  forceUpdateMaterials(cameraPosition: THREE.Vector3): void {
    const updateNode = (node: OctreeNode) => {
      if (node.mesh) {
        node.lastMaterialUpdate = 0; // Force update
        this.updateNodeMaterial(node, cameraPosition);
      }

      if (node.children) {
        for (const child of node.children) {
          updateNode(child);
        }
      }
    };

    updateNode(this.root);
  }

  /**
   * Get nodes within a specific distance range
   */
  getNodesInRange(
    cameraPosition: THREE.Vector3,
    minDistance: number,
    maxDistance: number,
  ): OctreeNode[] {
    const nodesInRange: OctreeNode[] = [];

    const traverse = (node: OctreeNode) => {
      const distance = this.calculateNodeDistance(node, cameraPosition);

      if (distance >= minDistance && distance <= maxDistance) {
        nodesInRange.push(node);
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(this.root);
    return nodesInRange;
  }

  /**
   * Get performance-critical statistics
   */
  getPerformanceStats(): {
    visibleNodes: number;
    renderedStars: number;
    meshCount: number;
    avgLOD: number;
    qualityLevel: string;
  } {
    let renderedStars = 0;
    let meshCount = 0;
    let totalLOD = 0;
    let lodCount = 0;

    for (const node of this.visibleNodes) {
      if (node.mesh) {
        meshCount++;
        renderedStars += node.stars.length;
      }

      if (node.lodLevel !== undefined) {
        totalLOD += node.lodLevel;
        lodCount++;
      }
    }

    return {
      visibleNodes: this.visibleNodes.size,
      renderedStars,
      meshCount,
      avgLOD: lodCount > 0 ? totalLOD / lodCount : 0,
      qualityLevel: this.qualityManager.getCurrentSettings().quality,
    };
  }
}

export type { Star3D, OctreeNode, BoundingBox3D };
