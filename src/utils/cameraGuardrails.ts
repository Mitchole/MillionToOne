import * as THREE from 'three';
import { Camera3D } from '../types';
import { StarOctree } from './octree';
import { generateCameraPath } from './camera3d';

interface PathValidationResult {
  isValid: boolean;
  problematicSegments: number[];
  recommendedPath?: Camera3D[];
  reason?: string;
}

interface GuardrailConfig {
  minStarDensity: number; // Minimum stars per cubic unit
  maxEmptyDistance: number; // Maximum distance through empty space
  pathSegments: number; // Number of segments to validate along path
  searchRadius: number; // Radius to search for stars around path points
  rerouting: {
    enabled: boolean;
    maxAttempts: number;
    detourFactor: number; // How much to deviate from original path
  };
}

export class CameraGuardrails {
  private config: GuardrailConfig;
  private octree: StarOctree;
  private loadedChunks: Set<string> = new Set();

  constructor(octree: StarOctree, config?: Partial<GuardrailConfig>) {
    this.octree = octree;
    this.config = {
      minStarDensity: 0.001,
      maxEmptyDistance: 500,
      pathSegments: 50,
      searchRadius: 100,
      rerouting: {
        enabled: true,
        maxAttempts: 3,
        detourFactor: 0.3,
      },
      ...config,
    };
  }

  /**
   * Validate a camera path for star density and chunk availability
   */
  validatePath(startCamera: Camera3D, endCamera: Camera3D): PathValidationResult {
    const path = generateCameraPath(startCamera, endCamera, this.config.pathSegments);
    const problematicSegments: number[] = [];
    let currentEmptyDistance = 0;

    for (let i = 0; i < path.length; i++) {
      const camera = path[i];
      const starDensity = this.calculateStarDensity(camera);

      if (starDensity < this.config.minStarDensity) {
        problematicSegments.push(i);

        // Calculate distance through empty space
        if (i > 0) {
          const prevCamera = path[i - 1];
          const segmentDistance = this.calculateDistance(prevCamera, camera);
          currentEmptyDistance += segmentDistance;
        }

        if (currentEmptyDistance > this.config.maxEmptyDistance) {
          return {
            isValid: false,
            problematicSegments,
            reason: `Path traverses ${currentEmptyDistance.toFixed(0)} units of empty space (max: ${this.config.maxEmptyDistance})`,
          };
        }
      } else {
        currentEmptyDistance = 0; // Reset empty distance counter
      }
    }

    if (problematicSegments.length > path.length * 0.5) {
      return {
        isValid: false,
        problematicSegments,
        reason: 'More than 50% of path segments have insufficient star density',
      };
    }

    return {
      isValid: true,
      problematicSegments,
    };
  }

  /**
   * Adjust path to avoid empty space
   */
  adjustPath(startCamera: Camera3D, endCamera: Camera3D, loadedChunks: Set<string>): Camera3D[] {
    this.loadedChunks = loadedChunks;

    // First, try the direct path
    const directValidation = this.validatePath(startCamera, endCamera);
    if (directValidation.isValid) {
      return generateCameraPath(startCamera, endCamera, this.config.pathSegments);
    }

    // If direct path fails and rerouting is enabled, try to find an alternative
    if (this.config.rerouting.enabled) {
      const adjustedPath = this.findAlternativePath(startCamera, endCamera);
      if (adjustedPath) {
        return adjustedPath;
      }
    }

    // If all else fails, return the original path with a warning
    console.warn('Camera guardrails: Could not find valid path, using original path');
    return generateCameraPath(startCamera, endCamera, this.config.pathSegments);
  }

  /**
   * Find an alternative path that avoids empty space
   */
  private findAlternativePath(startCamera: Camera3D, endCamera: Camera3D): Camera3D[] | null {
    const { maxAttempts, detourFactor } = this.config.rerouting;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Create waypoints that deviate from the direct path
      const waypoints = this.generateWaypoints(startCamera, endCamera, attempt, detourFactor);

      // Validate each segment of the waypointed path
      let validPath = true;
      const fullPath: Camera3D[] = [];

      for (let i = 0; i < waypoints.length - 1; i++) {
        const segmentValidation = this.validatePath(waypoints[i], waypoints[i + 1]);
        if (!segmentValidation.isValid) {
          validPath = false;
          break;
        }

        // Add segment to full path
        const segmentPath = generateCameraPath(waypoints[i], waypoints[i + 1], 20);
        if (i === 0) {
          fullPath.push(...segmentPath);
        } else {
          fullPath.push(...segmentPath.slice(1)); // Skip first point to avoid duplication
        }
      }

      if (validPath) {
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Generate waypoints for alternative path
   */
  private generateWaypoints(
    startCamera: Camera3D,
    endCamera: Camera3D,
    attempt: number,
    detourFactor: number,
  ): Camera3D[] {
    const waypoints = [startCamera];

    // Calculate midpoint with deviation
    const midpoint = this.interpolateCamera(startCamera, endCamera, 0.5);

    // Add perpendicular deviation based on attempt
    const direction = {
      x: endCamera.position.x - startCamera.position.x,
      y: endCamera.position.y - startCamera.position.y,
      z: endCamera.position.z - startCamera.position.z,
    };

    const perpendicular = {
      x: -direction.y,
      y: direction.x,
      z: direction.z * 0.5, // Reduce z deviation
    };

    const magnitude = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y + direction.z * direction.z,
    );

    const deviation = magnitude * detourFactor * (attempt + 1);
    const perpMagnitude = Math.sqrt(
      perpendicular.x * perpendicular.x +
        perpendicular.y * perpendicular.y +
        perpendicular.z * perpendicular.z,
    );

    if (perpMagnitude > 0) {
      const normalizedPerp = {
        x: perpendicular.x / perpMagnitude,
        y: perpendicular.y / perpMagnitude,
        z: perpendicular.z / perpMagnitude,
      };

      // Alternate deviation direction based on attempt
      const deviationDirection = attempt % 2 === 0 ? 1 : -1;

      midpoint.position.x += normalizedPerp.x * deviation * deviationDirection;
      midpoint.position.y += normalizedPerp.y * deviation * deviationDirection;
      midpoint.position.z += normalizedPerp.z * deviation * deviationDirection;
    }

    waypoints.push(midpoint);
    waypoints.push(endCamera);

    return waypoints;
  }

  /**
   * Calculate star density around a camera position
   */
  private calculateStarDensity(camera: Camera3D): number {
    const searchBounds = {
      min: new THREE.Vector3(
        camera.position.x - this.config.searchRadius,
        camera.position.y - this.config.searchRadius,
        camera.position.z - this.config.searchRadius,
      ),
      max: new THREE.Vector3(
        camera.position.x + this.config.searchRadius,
        camera.position.y + this.config.searchRadius,
        camera.position.z + this.config.searchRadius,
      ),
    };

    // Create a temporary camera for querying
    const tempCamera = new THREE.PerspectiveCamera(camera.fieldOfView, 1, camera.near, camera.far);
    tempCamera.position.set(camera.position.x, camera.position.y, camera.position.z);
    tempCamera.lookAt(0, 0, 0);

    const visibleStars = this.octree.getStarsInFrustum(tempCamera);
    const searchVolume = Math.pow(this.config.searchRadius * 2, 3);

    return visibleStars.length / searchVolume;
  }

  /**
   * Calculate distance between two camera positions
   */
  private calculateDistance(camera1: Camera3D, camera2: Camera3D): number {
    const dx = camera2.position.x - camera1.position.x;
    const dy = camera2.position.y - camera1.position.y;
    const dz = camera2.position.z - camera1.position.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Interpolate between two camera positions
   */
  private interpolateCamera(camera1: Camera3D, camera2: Camera3D, t: number): Camera3D {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    return {
      position: {
        x: lerp(camera1.position.x, camera2.position.x, t),
        y: lerp(camera1.position.y, camera2.position.y, t),
        z: lerp(camera1.position.z, camera2.position.z, t),
      },
      rotation: {
        pitch: lerp(camera1.rotation.pitch, camera2.rotation.pitch, t),
        yaw: lerp(camera1.rotation.yaw, camera2.rotation.yaw, t),
        roll: lerp(camera1.rotation.roll, camera2.rotation.roll, t),
      },
      fieldOfView: lerp(camera1.fieldOfView, camera2.fieldOfView, t),
      near: lerp(camera1.near, camera2.near, t),
      far: lerp(camera1.far, camera2.far, t),
      zoom: lerp(camera1.zoom, camera2.zoom, t),
    };
  }

  /**
   * Preload chunks along a path
   */
  async preloadAlongPath(path: Camera3D[], preloadDistance: number = 1000): Promise<void> {
    const preloadPromises: Promise<void>[] = [];

    for (const camera of path) {
      // Create temporary camera for frustum calculation
      const tempCamera = new THREE.PerspectiveCamera(
        camera.fieldOfView,
        1,
        camera.near,
        Math.min(camera.far, preloadDistance),
      );
      tempCamera.position.set(camera.position.x, camera.position.y, camera.position.z);
      tempCamera.lookAt(0, 0, 0);

      // Update octree visibility to trigger chunk loading
      this.octree.updateVisibility(tempCamera);

      // Add small delay to prevent overwhelming the system
      preloadPromises.push(new Promise((resolve) => setTimeout(resolve, 16)));
    }

    await Promise.all(preloadPromises);
  }

  /**
   * Get guardrail statistics for debugging
   */
  getStats(): {
    config: GuardrailConfig;
    loadedChunks: number;
    lastValidationResult?: PathValidationResult;
  } {
    return {
      config: this.config,
      loadedChunks: this.loadedChunks.size,
    };
  }

  /**
   * Update guardrail configuration
   */
  updateConfig(newConfig: Partial<GuardrailConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export type { PathValidationResult, GuardrailConfig };
