import gsap from 'gsap';
import { SceneType, AnimationConfig } from '../types';

export const SCENE_CONFIGS: Record<SceneType, { hasAmbientPanning: boolean; showCanvas: boolean }> =
  {
    landing: { hasAmbientPanning: true, showCanvas: true },
    ticket: { hasAmbientPanning: false, showCanvas: true },
    zoom1: { hasAmbientPanning: true, showCanvas: true },
    zoom2: { hasAmbientPanning: true, showCanvas: true },
    'your-choice': { hasAmbientPanning: false, showCanvas: true },
    'winner-reveal': { hasAmbientPanning: false, showCanvas: true },
    lifetime: { hasAmbientPanning: true, showCanvas: false },
    report: { hasAmbientPanning: false, showCanvas: false },
    'star-demo': { hasAmbientPanning: true, showCanvas: true },
    none: { hasAmbientPanning: false, showCanvas: true },
  };

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  duration: 0.7,
  ease: 'power2.inOut',
};

export const ZOOM_ANIMATION_CONFIG: AnimationConfig = {
  duration: 8,
  ease: 'power2.inOut',
};

export const REVEAL_ANIMATION_CONFIG: AnimationConfig = {
  duration: 8,
  ease: 'power3.inOut',
};

/**
 * Create ambient panning animation
 */
export const createAmbientPan = (
  camera: { x: number; y: number },
  onUpdate: () => void,
): gsap.core.Tween => {
  return gsap.to(camera, {
    x: `+=${(Math.random() - 0.5) * 1000}`,
    y: `+=${(Math.random() - 0.5) * 1000}`,
    duration: 350,
    ease: 'none',
    repeat: -1,
    yoyo: true,
    onUpdate,
  });
};

/**
 * Create scene transition animation
 */
export const createSceneTransition = (
  outgoingElement: HTMLElement | null,
  incomingElement: HTMLElement | null,
  config: AnimationConfig = DEFAULT_ANIMATION_CONFIG,
): gsap.core.Timeline => {
  const tl = gsap.timeline();

  if (outgoingElement) {
    tl.to(outgoingElement, {
      autoAlpha: 0,
      duration: config.duration,
      ease: config.ease,
    });
  }

  if (incomingElement) {
    const delay = outgoingElement ? 0.3 : 0;
    tl.to(
      incomingElement,
      {
        autoAlpha: 1,
        duration: config.duration,
        ease: config.ease,
        delay,
      },
      outgoingElement ? 0 : 0,
    );
  }

  return tl;
};

/**
 * Create zoom animation towards target
 */
export const createZoomAnimation = (
  camera: { x: number; y: number; zoom: number },
  target: { x: number; y: number },
  targetZoom: number,
  onUpdate: () => void,
  config: AnimationConfig = ZOOM_ANIMATION_CONFIG,
): gsap.core.Tween => {
  return gsap.to(camera, {
    x: target.x,
    y: target.y,
    zoom: targetZoom,
    duration: config.duration,
    ease: config.ease,
    onUpdate,
  });
};

/**
 * Create winner reveal animation sequence
 */
export const createWinnerRevealAnimation = (
  camera: { x: number; y: number; zoom: number },
  targetDot: { x: number; y: number; size: number },
  winnerDot: { x: number; y: number },
  onUpdate: () => void,
): gsap.core.Timeline => {
  const tl = gsap.timeline({ onUpdate });

  // Zoom out to galaxy view
  tl.to(
    camera,
    {
      x: 0,
      y: 0,
      zoom: 1,
      duration: 4,
      ease: 'power2.inOut',
    },
    0,
  );

  // Shrink target dot
  tl.to(
    targetDot,
    {
      size: 0,
      duration: 1,
      ease: 'power2.in',
    },
    0,
  );

  // Zoom to winner
  tl.to(camera, {
    x: winnerDot.x,
    y: winnerDot.y,
    zoom: 500,
    duration: 8,
    ease: 'power3.inOut',
  });

  return tl;
};

/**
 * Create lifetime transition animation
 */
export const createLifetimeTransition = (
  zoomCanvas: HTMLCanvasElement,
  lifetimeScene: HTMLElement,
): gsap.core.Timeline => {
  const tl = gsap.timeline();

  // Fade out zoom canvas
  tl.to(zoomCanvas, {
    opacity: 0,
    duration: 3,
    ease: 'power2.inOut',
  });

  // Fade in lifetime scene
  tl.to(
    lifetimeScene,
    {
      autoAlpha: 1,
      duration: 3,
      ease: 'power2.inOut',
    },
    0,
  );

  return tl;
};

/**
 * Check if reduced motion is preferred
 */
export const isReducedMotionPreferred = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Apply reduced motion alternatives
 */
export const applyReducedMotionConfig = (config: AnimationConfig): AnimationConfig => {
  if (isReducedMotionPreferred()) {
    return {
      ...config,
      duration: 0.1,
      ease: 'none',
    };
  }
  return config;
};

/**
 * Create a safe GSAP context for cleanup
 */
export const createGSAPContext = (): gsap.Context => {
  return gsap.context(() => {});
};

/**
 * Kill all GSAP animations
 */
export const killAllAnimations = (): void => {
  gsap.killTweensOf('*');
};
