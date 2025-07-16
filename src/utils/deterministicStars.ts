/**
 * 🌟 DETERMINISTIC STAR UNIVERSE
 *
 * This system creates a deterministic universe of exactly 139,838,160 stars
 * (matching UK Euromillions lottery odds). Each star has a fixed position
 * based on its index and a seed, allowing us to:
 *
 * 1. Know the exact position of any star without storing all positions
 * 2. Generate only visible stars in chunks
 * 3. Fly to any specific star number
 * 4. Maintain perfect reproducibility
 */

import * as THREE from 'three';

// Constants
export const TOTAL_STARS = 139_838_160; // Exact UK Euromillions odds
export const UNIVERSE_SEED = 42; // Fixed seed for reproducibility
export const UNIVERSE_SIZE = 1_000_000; // Universe extends from -500k to +500k in each axis

/**
 * Seeded random number generator (Mulberry32)
 * Returns deterministic pseudo-random numbers based on seed
 */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Generate random number in range [min, max)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Calculate the exact 3D position of a specific star
 * @param starIndex - Star number (1 to 139,838,160)
 * @param seed - Seed for deterministic generation
 * @returns Fixed 3D position for this star
 */
export function getStarPosition(starIndex: number, seed: number = UNIVERSE_SEED): THREE.Vector3 {
  if (starIndex < 1 || starIndex > TOTAL_STARS) {
    throw new Error(`Star index ${starIndex} out of range (1-${TOTAL_STARS})`);
  }

  // Create seeded random generator for this specific star
  const rng = new SeededRandom(seed + starIndex);

  // Generate deterministic position within universe bounds
  const x = rng.range(-UNIVERSE_SIZE / 2, UNIVERSE_SIZE / 2);
  const y = rng.range(-UNIVERSE_SIZE / 2, UNIVERSE_SIZE / 2);
  const z = rng.range(-UNIVERSE_SIZE / 2, UNIVERSE_SIZE / 2);

  return new THREE.Vector3(x, y, z);
}

/**
 * Find all stars that exist within a given chunk's bounds
 * @param chunkBounds - Spatial bounds of the chunk
 * @param seed - Seed for deterministic generation
 * @returns Array of stars within this chunk
 */
export function getStarsInChunk(
  chunkBounds: { min: THREE.Vector3; max: THREE.Vector3 },
  seed: number = UNIVERSE_SEED,
): Array<{ position: THREE.Vector3; starIndex: number }> {
  const starsInChunk: Array<{ position: THREE.Vector3; starIndex: number }> = [];

  // Estimate how many stars to check based on chunk volume vs universe volume
  const chunkVolume =
    (chunkBounds.max.x - chunkBounds.min.x) *
    (chunkBounds.max.y - chunkBounds.min.y) *
    (chunkBounds.max.z - chunkBounds.min.z);

  const universeVolume = UNIVERSE_SIZE * UNIVERSE_SIZE * UNIVERSE_SIZE;
  const estimatedStarsInChunk = Math.floor((chunkVolume / universeVolume) * TOTAL_STARS);

  // 🌟 IMPROVED SAMPLING: Increase sampling rate for better star density
  // Balance between performance and visual quality
  const sampleSize = Math.min(50000, Math.max(2000, estimatedStarsInChunk * 20));
  const step = Math.max(1, Math.floor(TOTAL_STARS / sampleSize));

  for (let i = 1; i <= TOTAL_STARS; i += step) {
    const position = getStarPosition(i, seed);

    // Check if this star falls within chunk bounds
    if (
      position.x >= chunkBounds.min.x &&
      position.x <= chunkBounds.max.x &&
      position.y >= chunkBounds.min.y &&
      position.y <= chunkBounds.max.y &&
      position.z >= chunkBounds.min.z &&
      position.z <= chunkBounds.max.z
    ) {
      starsInChunk.push({ position, starIndex: i });
    }
  }

  // 🌟 VISUAL DENSITY GUARANTEE: Ensure every chunk has at least some stars
  // This maintains the deterministic universe while ensuring good visual experience
  const minStarsPerChunk = 150; // Balanced density - reduces clutter while maintaining even distribution
  if (starsInChunk.length < minStarsPerChunk) {
    // Generate additional "background" stars deterministically based on chunk center
    const chunkCenter = new THREE.Vector3(
      (chunkBounds.min.x + chunkBounds.max.x) / 2,
      (chunkBounds.min.y + chunkBounds.max.y) / 2,
      (chunkBounds.min.z + chunkBounds.max.z) / 2,
    );

    // Use chunk center as seed for background stars
    const chunkSeed =
      Math.floor(chunkCenter.x) +
      Math.floor(chunkCenter.y) * 1000 +
      Math.floor(chunkCenter.z) * 1000000;
    const bgRng = new SeededRandom(seed + chunkSeed);

    const starsToAdd = minStarsPerChunk - starsInChunk.length;

    // 🌟 CLUSTERING LOGIC: Create small clusters of stars for better visual impact
    const clusterCount = Math.ceil(starsToAdd / 8); // Average 8 stars per cluster
    const clusterRadius = 300; // Cluster radius in units

    for (let cluster = 0; cluster < clusterCount; cluster++) {
      // Generate cluster center
      const clusterCenter = new THREE.Vector3(
        bgRng.range(chunkBounds.min.x + clusterRadius, chunkBounds.max.x - clusterRadius),
        bgRng.range(chunkBounds.min.y + clusterRadius, chunkBounds.max.y - clusterRadius),
        bgRng.range(chunkBounds.min.z + clusterRadius, chunkBounds.max.z - clusterRadius),
      );

      // Add stars around cluster center
      const starsInCluster = Math.min(8, starsToAdd - cluster * 8);
      for (let i = 0; i < starsInCluster; i++) {
        // Create clustered position with exponential falloff
        const angle1 = bgRng.range(0, Math.PI * 2);
        const angle2 = bgRng.range(0, Math.PI * 2);
        const distance = bgRng.range(10, clusterRadius) * Math.pow(bgRng.range(0, 1), 2); // Exponential falloff

        const bgPosition = new THREE.Vector3(
          clusterCenter.x + Math.cos(angle1) * Math.sin(angle2) * distance,
          clusterCenter.y + Math.sin(angle1) * Math.sin(angle2) * distance,
          clusterCenter.z + Math.cos(angle2) * distance,
        );

        // Ensure star stays within chunk bounds
        bgPosition.clamp(
          new THREE.Vector3(chunkBounds.min.x, chunkBounds.min.y, chunkBounds.min.z),
          new THREE.Vector3(chunkBounds.max.x, chunkBounds.max.y, chunkBounds.max.z),
        );

        // Use negative indices for background stars to distinguish from main universe
        starsInChunk.push({ position: bgPosition, starIndex: -(cluster * 8 + i + 1) });
      }
    }
  }

  return starsInChunk;
}

/**
 * Get a random target star for zoom animations
 * @param seed - Optional seed for reproducible target selection
 * @returns Star index and position
 */
export function getRandomTargetStar(seed?: number): { starIndex: number; position: THREE.Vector3 } {
  const targetSeed = seed || UNIVERSE_SEED + Date.now();
  const rng = new SeededRandom(targetSeed);

  const starIndex = Math.floor(rng.range(1, TOTAL_STARS + 1));
  const position = getStarPosition(starIndex);

  return { starIndex, position };
}

/**
 * Calculate which chunk contains a specific star
 * @param starIndex - Star number
 * @param chunkSize - Size of chunks
 * @returns Chunk coordinates
 */
export function getChunkForStar(starIndex: number, chunkSize: number): THREE.Vector3 {
  const position = getStarPosition(starIndex);

  return new THREE.Vector3(
    Math.floor(position.x / chunkSize) * chunkSize,
    Math.floor(position.y / chunkSize) * chunkSize,
    Math.floor(position.z / chunkSize) * chunkSize,
  );
}

/**
 * Create a flight path to a specific star
 * @param startPosition - Current camera position
 * @param targetStarIndex - Target star number
 * @param steps - Number of steps in the path
 * @returns Array of positions for smooth camera movement
 */
export function createPathToStar(
  startPosition: THREE.Vector3,
  targetStarIndex: number,
  steps: number = 120,
): THREE.Vector3[] {
  const targetPosition = getStarPosition(targetStarIndex);
  const path: THREE.Vector3[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const position = new THREE.Vector3().lerpVectors(startPosition, targetPosition, t);
    path.push(position);
  }

  return path;
}
