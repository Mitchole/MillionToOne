import * as THREE from 'three';
import { Star3D } from './octree';
import { mulberry32, generateSeed } from './seededRandom';

export interface LODLevel3D {
  level: number;
  zoomThreshold: number;
  octreeDepth: number;
  starsPerNode: number;
  renderDistance: number;
  name: string;
}

export const LOD_LEVELS_3D: LODLevel3D[] = [
  {
    level: 0,
    zoomThreshold: 0,
    octreeDepth: 4,
    starsPerNode: 100,
    renderDistance: 10000,
    name: 'Galaxy',
  },
  {
    level: 1,
    zoomThreshold: 5,
    octreeDepth: 6,
    starsPerNode: 150,
    renderDistance: 2000,
    name: 'Cluster',
  },
  {
    level: 2,
    zoomThreshold: 40,
    octreeDepth: 8,
    starsPerNode: 200,
    renderDistance: 500,
    name: 'Local',
  },
];

/**
 * Generate 3D stars for a specific region using seeded random
 */
export const generateStars3D = (
  bounds: { min: THREE.Vector3; max: THREE.Vector3 },
  starCount: number,
  lodLevel: number = 0,
): Star3D[] => {
  const stars: Star3D[] = [];
  const seed = generateSeed(
    Math.floor(bounds.min.x / 1000),
    Math.floor(bounds.min.y / 1000),
    Math.floor(bounds.min.z / 1000) + lodLevel,
  );
  const random = mulberry32(seed);

  for (let i = 0; i < starCount; i++) {
    const position = new THREE.Vector3(
      bounds.min.x + random() * (bounds.max.x - bounds.min.x),
      bounds.min.y + random() * (bounds.max.y - bounds.min.y),
      bounds.min.z + random() * (bounds.max.z - bounds.min.z),
    );

    // Generate star color based on position for consistency
    const colorSeed = generateSeed(
      Math.floor(position.x),
      Math.floor(position.y),
      Math.floor(position.z),
    );
    const colorRandom = mulberry32(colorSeed);

    const color = generateStarColor(colorRandom);
    const size = 0.5 + random() * 1.5;
    const intensity = 0.3 + random() * 0.7;

    stars.push({
      id: `star_${i}_${seed}`,
      position,
      color,
      size,
      intensity,
    });
  }

  return stars;
};

/**
 * Generate realistic star colors
 */
const generateStarColor = (random: () => number): THREE.Color => {
  const colorType = random();

  if (colorType < 0.1) {
    // Blue giants (rare)
    return new THREE.Color(0.7 + random() * 0.3, 0.8 + random() * 0.2, 1.0);
  } else if (colorType < 0.3) {
    // White stars
    return new THREE.Color(0.9 + random() * 0.1, 0.9 + random() * 0.1, 0.9 + random() * 0.1);
  } else if (colorType < 0.7) {
    // Yellow/Orange stars (most common)
    return new THREE.Color(1.0, 0.8 + random() * 0.2, 0.4 + random() * 0.4);
  } else {
    // Red stars
    return new THREE.Color(1.0, 0.3 + random() * 0.3, 0.1 + random() * 0.2);
  }
};

/**
 * Get optimal LOD level for current camera position
 */
export const getOptimalLOD3D = (camera: THREE.PerspectiveCamera): LODLevel3D => {
  // Calculate effective zoom based on camera distance from origin
  const distance = camera.position.length();
  const zoom = 1000 / Math.max(distance, 100);

  for (let i = LOD_LEVELS_3D.length - 1; i >= 0; i--) {
    if (zoom >= LOD_LEVELS_3D[i].zoomThreshold) {
      return LOD_LEVELS_3D[i];
    }
  }

  return LOD_LEVELS_3D[0];
};

/**
 * Create target and winner dots in 3D space
 */
export const createTargetDots3D = (): {
  targetDot: Star3D;
  winnerDot: Star3D;
} => {
  const worldSize = 25000;

  const targetDot: Star3D = {
    id: 'target_dot',
    position: new THREE.Vector3(
      (Math.random() - 0.5) * worldSize,
      (Math.random() - 0.5) * worldSize,
      (Math.random() - 0.5) * worldSize * 0.1, // Keep dots relatively flat
    ),
    color: new THREE.Color(0xfacc15), // Yellow
    size: 3,
    intensity: 1.0,
  };

  let winnerDot: Star3D;
  do {
    winnerDot = {
      id: 'winner_dot',
      position: new THREE.Vector3(
        (Math.random() - 0.5) * worldSize,
        (Math.random() - 0.5) * worldSize,
        (Math.random() - 0.5) * worldSize * 0.1,
      ),
      color: new THREE.Color(0x60a5fa), // Blue
      size: 3,
      intensity: 1.0,
    };
  } while (targetDot.position.distanceTo(winnerDot.position) < worldSize / 2);

  return { targetDot, winnerDot };
};

/**
 * Convert 2D camera coordinates to 3D position
 */
export const convert2DTo3D = (camera2D: { x: number; y: number; zoom: number }): THREE.Vector3 => {
  return new THREE.Vector3(camera2D.x, camera2D.y, 1000 / Math.max(camera2D.zoom, 0.1));
};

/**
 * Convert 3D position back to 2D camera coordinates
 */
export const convert3DTo2D = (position: THREE.Vector3): { x: number; y: number; zoom: number } => {
  return {
    x: position.x,
    y: position.y,
    zoom: 1000 / Math.max(position.z, 100),
  };
};

/**
 * Generate stars for lottery visualization (139,838,160 total)
 */
export const generateLotteryStars = (
  bounds: { min: THREE.Vector3; max: THREE.Vector3 },
  density: number = 1.0,
): Star3D[] => {
  const volume =
    (bounds.max.x - bounds.min.x) * (bounds.max.y - bounds.min.y) * (bounds.max.z - bounds.min.z);

  // Target density: 139,838,160 stars in a 50km x 50km x 10km volume
  const targetVolume = 50000 * 50000 * 10000;
  const targetDensity = 139838160 / targetVolume;

  const starCount = Math.floor(volume * targetDensity * density);
  return generateStars3D(bounds, starCount);
};

/**
 * Create star clusters for visual interest
 */
export const createStarClusters = (
  centerPosition: THREE.Vector3,
  clusterRadius: number,
  starCount: number,
  lodLevel: number = 0,
): Star3D[] => {
  const bounds = {
    min: centerPosition.clone().subScalar(clusterRadius),
    max: centerPosition.clone().addScalar(clusterRadius),
  };

  const clusterStars = generateStars3D(bounds, starCount, lodLevel);

  // Add some clustering effect by adjusting positions
  const seed = generateSeed(
    Math.floor(centerPosition.x),
    Math.floor(centerPosition.y),
    Math.floor(centerPosition.z),
  );
  const random = mulberry32(seed);

  return clusterStars.map((star, index) => {
    // Apply gaussian distribution for clustering
    const gaussianX = (random() + random() + random() + random() + random() + random() - 3) / 3;
    const gaussianY = (random() + random() + random() + random() + random() + random() - 3) / 3;
    const gaussianZ = (random() + random() + random() + random() + random() + random() - 3) / 3;

    const clusterOffset = new THREE.Vector3(
      gaussianX * clusterRadius * 0.3,
      gaussianY * clusterRadius * 0.3,
      gaussianZ * clusterRadius * 0.1, // Flatter distribution in z
    );

    return {
      ...star,
      id: `cluster_${index}_${seed}`,
      position: centerPosition.clone().add(clusterOffset),
      size: star.size * (0.8 + random() * 0.4), // Vary cluster star sizes
    };
  });
};
