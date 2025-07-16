import { useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Camera3D, CameraState } from '../types';
import {
  convert2DTo3DCamera,
  convert3DTo2DCamera,
  syncCameraStates,
  getCameraDistance,
  getCameraVelocity,
  interpolateCamera3D,
  clampCamera3D,
  isCameraInBounds,
} from '../utils/camera3d';

interface UseCamera3DReturn {
  camera3D: Camera3D;
  camera2D: CameraState;
  updateCamera3D: (updates: Partial<Camera3D>) => void;
  updateCamera2D: (updates: Partial<CameraState>) => void;
  syncCameras: () => void;
  getCameraDistance: () => number;
  getCameraVelocity: () => number;
  interpolateToCamera: (targetCamera: Camera3D, duration: number) => Promise<void>;
  clampTobounds: (bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  }) => void;
  isInBounds: (bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  }) => boolean;
}

export const useCamera3D = (): UseCamera3DReturn => {
  const { state, dispatch } = useAppContext();
  const previousCamera3DRef = useRef<Camera3D>(state.camera3D);
  const animationRef = useRef<number | null>(null);

  // Update previous camera reference when camera changes
  useEffect(() => {
    previousCamera3DRef.current = state.camera3D;
  }, [state.camera3D]);

  // Update 3D camera state
  const updateCamera3D = useCallback(
    (updates: Partial<Camera3D>) => {
      dispatch({ type: 'SET_CAMERA_3D', payload: updates });
    },
    [dispatch],
  );

  // Update 2D camera state
  const updateCamera2D = useCallback(
    (updates: Partial<CameraState>) => {
      dispatch({ type: 'SET_CAMERA', payload: updates });
    },
    [dispatch],
  );

  // Synchronize camera states
  const syncCameras = useCallback(() => {
    const synced = syncCameraStates(state.camera, state.camera3D);
    dispatch({ type: 'SET_CAMERA', payload: synced.camera2D });
    dispatch({ type: 'SET_CAMERA_3D', payload: synced.camera3D });
  }, [state.camera, state.camera3D, dispatch]);

  // Get camera distance from origin
  const getCameraDistanceFromOrigin = useCallback(() => {
    return getCameraDistance(state.camera3D);
  }, [state.camera3D]);

  // Get camera velocity
  const getCameraVelocityValue = useCallback(() => {
    return getCameraVelocity(previousCamera3DRef.current, state.camera3D);
  }, [state.camera3D]);

  // Interpolate to target camera over time
  const interpolateToCamera = useCallback(
    async (targetCamera: Camera3D, duration: number): Promise<void> => {
      return new Promise((resolve) => {
        const startCamera = state.camera3D;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Use easing function for smooth animation
          const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

          const interpolatedCamera = interpolateCamera3D(startCamera, targetCamera, easeProgress);

          updateCamera3D(interpolatedCamera);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            animationRef.current = null;
            resolve();
          }
        };

        // Cancel any existing animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }

        animationRef.current = requestAnimationFrame(animate);
      });
    },
    [state.camera3D, updateCamera3D],
  );

  // Clamp camera to bounds
  const clampTobounds = useCallback(
    (bounds: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    }) => {
      const clampedCamera = clampCamera3D(state.camera3D, bounds);
      updateCamera3D(clampedCamera);
    },
    [state.camera3D, updateCamera3D],
  );

  // Check if camera is in bounds
  const isInBounds = useCallback(
    (bounds: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    }) => {
      return isCameraInBounds(state.camera3D, bounds);
    },
    [state.camera3D],
  );

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    camera3D: state.camera3D,
    camera2D: state.camera,
    updateCamera3D,
    updateCamera2D,
    syncCameras,
    getCameraDistance: getCameraDistanceFromOrigin,
    getCameraVelocity: getCameraVelocityValue,
    interpolateToCamera,
    clampTobounds,
    isInBounds,
  };
};
