import { CameraState, Camera3D } from '../types';

/**
 * Convert 2D camera coordinates to 3D camera state
 */
export const convert2DTo3DCamera = (camera2D: CameraState): Camera3D => {
  // Convert zoom to z-position (closer = higher zoom)
  const zPosition = 1000 / Math.max(camera2D.zoom, 0.1);

  return {
    position: {
      x: camera2D.x,
      y: camera2D.y,
      z: zPosition,
    },
    rotation: {
      pitch: 0,
      yaw: 0,
      roll: 0,
    },
    fieldOfView: 75,
    near: 0.1,
    far: 50000,
    zoom: camera2D.zoom,
  };
};

/**
 * Convert 3D camera state back to 2D camera coordinates
 */
export const convert3DTo2DCamera = (camera3D: Camera3D): CameraState => {
  // Convert z-position back to zoom
  const zoom = 1000 / Math.max(camera3D.position.z, 100);

  return {
    x: camera3D.position.x,
    y: camera3D.position.y,
    zoom,
  };
};

/**
 * Synchronize 2D and 3D camera states
 */
export const syncCameraStates = (
  camera2D: CameraState,
  camera3D: Camera3D,
): { camera2D: CameraState; camera3D: Camera3D } => {
  // Keep 2D camera as the source of truth for compatibility
  const updated3D = convert2DTo3DCamera(camera2D);

  // Preserve 3D-specific properties
  updated3D.rotation = camera3D.rotation;
  updated3D.fieldOfView = camera3D.fieldOfView;
  updated3D.near = camera3D.near;
  updated3D.far = camera3D.far;

  return {
    camera2D,
    camera3D: updated3D,
  };
};

/**
 * Calculate camera distance from origin
 */
export const getCameraDistance = (camera3D: Camera3D): number => {
  return Math.sqrt(
    camera3D.position.x * camera3D.position.x +
      camera3D.position.y * camera3D.position.y +
      camera3D.position.z * camera3D.position.z,
  );
};

/**
 * Calculate camera velocity between two states
 */
export const getCameraVelocity = (prevCamera: Camera3D, currentCamera: Camera3D): number => {
  const deltaX = currentCamera.position.x - prevCamera.position.x;
  const deltaY = currentCamera.position.y - prevCamera.position.y;
  const deltaZ = currentCamera.position.z - prevCamera.position.z;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
};

/**
 * Interpolate between two 3D camera states
 */
export const interpolateCamera3D = (from: Camera3D, to: Camera3D, t: number): Camera3D => {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  return {
    position: {
      x: lerp(from.position.x, to.position.x, t),
      y: lerp(from.position.y, to.position.y, t),
      z: lerp(from.position.z, to.position.z, t),
    },
    rotation: {
      pitch: lerp(from.rotation.pitch, to.rotation.pitch, t),
      yaw: lerp(from.rotation.yaw, to.rotation.yaw, t),
      roll: lerp(from.rotation.roll, to.rotation.roll, t),
    },
    fieldOfView: lerp(from.fieldOfView, to.fieldOfView, t),
    near: lerp(from.near, to.near, t),
    far: lerp(from.far, to.far, t),
    zoom: lerp(from.zoom, to.zoom, t),
  };
};

/**
 * Generate camera path for smooth animation
 */
export const generateCameraPath = (
  startCamera: Camera3D,
  endCamera: Camera3D,
  steps: number = 60,
): Camera3D[] => {
  const path: Camera3D[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push(interpolateCamera3D(startCamera, endCamera, t));
  }

  return path;
};

/**
 * Clamp camera position within bounds
 */
export const clampCamera3D = (
  camera: Camera3D,
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  },
): Camera3D => {
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  return {
    ...camera,
    position: {
      x: clamp(camera.position.x, bounds.min.x, bounds.max.x),
      y: clamp(camera.position.y, bounds.min.y, bounds.max.y),
      z: clamp(camera.position.z, bounds.min.z, bounds.max.z),
    },
  };
};

/**
 * Calculate field of view based on distance and target size
 */
export const calculateFOV = (distance: number, targetSize: number): number => {
  const fov = 2 * Math.atan(targetSize / (2 * distance)) * (180 / Math.PI);
  return Math.max(10, Math.min(fov, 120)); // Clamp between 10 and 120 degrees
};

/**
 * Check if camera is within view bounds
 */
export const isCameraInBounds = (
  camera: Camera3D,
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  },
): boolean => {
  const pos = camera.position;
  return (
    pos.x >= bounds.min.x &&
    pos.x <= bounds.max.x &&
    pos.y >= bounds.min.y &&
    pos.y <= bounds.max.y &&
    pos.z >= bounds.min.z &&
    pos.z <= bounds.max.z
  );
};
