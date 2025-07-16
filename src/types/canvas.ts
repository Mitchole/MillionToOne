export interface CanvasSize {
  width: number;
  height: number;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface Camera3D {
  position: { x: number; y: number; z: number };
  rotation: { pitch: number; yaw: number; roll: number };
  fieldOfView: number;
  near: number;
  far: number;
  zoom: number; // Maintain compatibility with existing system
}

export interface Star {
  x: number;
  y: number;
  color: string;
  size: number;
  alpha?: number;
  layer?: number;
  parallaxFactor?: number;
  depthAlpha?: number;
}

export interface Dot {
  x: number;
  y: number;
  color: string;
  size: number;
  baseSize: number;
}

export interface LODLevel {
  level: number;
  zoomThreshold: number;
  cellSize: number;
  starsPerCell: number;
  name: string;
}

export interface LODTransition {
  from: LODLevel | null;
  to: LODLevel | null;
  progress: number;
  tween: gsap.core.Tween | null;
}

export interface CanvasContexts {
  background: CanvasRenderingContext2D | null;
  zoom: CanvasRenderingContext2D | null;
}
