import { useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useCamera3D } from './useCamera3D';
import { useSceneManager } from './useSceneManager';
import { useGSAP } from '@gsap/react';
import { generateCameraPath } from '../utils/camera3d';
import { convert2DTo3DCamera } from '../utils/camera3d';
import { Camera3D } from '../types';
import gsap from 'gsap';
import * as THREE from 'three';
import { getRandomTargetStar, createPathToStar } from '../utils/deterministicStars';

gsap.registerPlugin(useGSAP);

export const useZoomAnimations3D = (cameraRef?: React.RefObject<THREE.PerspectiveCamera>) => {
  const { state, dispatch } = useAppContext();
  const { camera3D, updateCamera3D, updateCamera2D } = useCamera3D();
  const { goToScene } = useSceneManager();

  // Get direct access to the Three.js camera
  const getThreeJSCamera = () => {
    if (cameraRef && cameraRef.current) {
      console.log('🎯 Using camera ref directly:', cameraRef.current);
      return cameraRef.current;
    }

    // For now, let's try a global approach - check if we can access the camera from window
    if (typeof window !== 'undefined' && (window as any).threejsCamera) {
      console.log('🎯 Found Three.js camera on window:', (window as any).threejsCamera);
      return (window as any).threejsCamera;
    }

    console.error('❌ No Three.js camera found - need to implement camera ref passing');
    return null;
  };

  const startZoom1Animation = useCallback(() => {
    console.log('🎯 startZoom1Animation called with state:', {
      targetDot: state.targetDot,
      camera3D: camera3D,
      currentScene: state.currentScene,
    });

    if (!state.targetDot) {
      console.log('❌ No target dot found - animation aborted');
      return;
    }

    // Get direct access to Three.js camera
    const threeCamera = getThreeJSCamera();
    if (!threeCamera) {
      console.error('❌ Three.js camera not found - falling back to React state animation');
      return;
    }

    console.log('🎯 DETERMINISTIC SOLUTION: Flying to specific star in universe!');

    // Get a random target star from our deterministic universe
    const targetStar = getRandomTargetStar(12345); // Fixed seed for reproducible demo
    console.log(
      `🌟 Flying to star #${targetStar.starIndex.toLocaleString()} at position:`,
      targetStar.position,
    );

    goToScene('none');

    // Create smooth path to the target star
    const startPosition = threeCamera.position.clone();
    const finalPosition = targetStar.position.clone();
    // Move camera slightly away from star to avoid clipping
    finalPosition.add(new THREE.Vector3(50, 50, 50));

    console.log('🚀 SIMPLIFIED ZOOM ANIMATION:');
    console.log('  Start:', startPosition);
    console.log('  Final:', finalPosition);

    const timeline = gsap.timeline({
      onComplete: () => {
        console.log('🎯 ZOOM COMPLETE! Final camera position:', threeCamera.position);
        goToScene('zoom2', true); // ✅ Transition to next scene after animation
      },
    });

    // Single smooth zoom to target
    timeline.to(threeCamera.position, {
      duration: 5, // Moderate speed
      x: finalPosition.x,
      y: finalPosition.y,
      z: finalPosition.z,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (Math.random() < 0.1) {
          console.log('🚀 ZOOMING - Camera at:', {
            x: threeCamera.position.x.toFixed(2),
            y: threeCamera.position.y.toFixed(2),
            z: threeCamera.position.z.toFixed(2),
          });
        }
      },
    });

    dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: null } });

    /*
    // Original complex animation - disabled for now
    // Generate smooth path with guardrails
    const path = generateCameraPath(camera3D, targetCamera, 120); // 120 frames for 8 seconds at 15fps
    
    // Create proxy object for GSAP animation
    const animationProxy = { progress: 0 };
    
    tl.to(animationProxy, {
      duration: 8,
      progress: 1,
      ease: 'power2.inOut',
      onUpdate: () => {
        const currentIndex = Math.floor(animationProxy.progress * (path.length - 1));
        const currentCamera = path[currentIndex];
        
        // Update 3D camera
        updateCamera3D(currentCamera);
        
        // Update 2D camera for compatibility
        updateCamera2D({
          x: currentCamera.position.x,
          y: currentCamera.position.y,
          zoom: currentCamera.zoom
        });
      }
    });

    dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: tl } });
    */
  }, [state.targetDot, camera3D, updateCamera3D, updateCamera2D, goToScene, dispatch]);

  const startRevealAnimation = useCallback(
    (targetZoom: number = 500) => {
      if (!state.targetDot) return;

      goToScene('none');

      // Convert target position to 3D camera
      const targetCamera: Camera3D = {
        position: {
          x: state.targetDot.x,
          y: state.targetDot.y,
          z: 1000 / targetZoom, // Convert zoom to z-position
        },
        rotation: { pitch: 0, yaw: 0, roll: 0 },
        fieldOfView: 75,
        near: 0.1,
        far: 50000,
        zoom: targetZoom,
      };

      // Generate smooth path
      const path = generateCameraPath(camera3D, targetCamera, 120);

      const tl = gsap.timeline({
        onComplete: () => {
          goToScene('your-choice', true);
        },
      });

      // Create proxy object for GSAP animation
      const animationProxy = { progress: 0 };

      tl.to(animationProxy, {
        duration: 8,
        progress: 1,
        ease: 'power3.inOut',
        onUpdate: () => {
          const currentIndex = Math.floor(animationProxy.progress * (path.length - 1));
          const currentCamera = path[currentIndex];

          // Update 3D camera
          updateCamera3D(currentCamera);

          // Update 2D camera for compatibility
          updateCamera2D({
            x: currentCamera.position.x,
            y: currentCamera.position.y,
            zoom: currentCamera.zoom,
          });
        },
      });

      dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: tl } });
    },
    [state.targetDot, camera3D, updateCamera3D, updateCamera2D, goToScene, dispatch],
  );

  const animateToWinner = useCallback(() => {
    if (!state.targetDot || !state.winnerDot) return;

    goToScene('none', true);

    const tl = gsap.timeline({
      onComplete: () => {
        goToScene('winner-reveal', true);
      },
    });

    // First, zoom out to galaxy view
    const galaxyCamera: Camera3D = {
      position: { x: 0, y: 0, z: 1000 },
      rotation: { pitch: 0, yaw: 0, roll: 0 },
      fieldOfView: 75,
      near: 0.1,
      far: 50000,
      zoom: 1,
    };

    const galaxyPath = generateCameraPath(camera3D, galaxyCamera, 60);
    const galaxyProxy = { progress: 0 };

    tl.to(
      galaxyProxy,
      {
        duration: 4,
        progress: 1,
        ease: 'power2.inOut',
        onUpdate: () => {
          const currentIndex = Math.floor(galaxyProxy.progress * (galaxyPath.length - 1));
          const currentCamera = galaxyPath[currentIndex];

          updateCamera3D(currentCamera);
          updateCamera2D({
            x: currentCamera.position.x,
            y: currentCamera.position.y,
            zoom: currentCamera.zoom,
          });
        },
      },
      0,
    );

    // Shrink target dot
    tl.to(
      state.targetDot,
      {
        duration: 1,
        size: 0,
        ease: 'power2.in',
        onUpdate: () => {
          if (state.targetDot) {
            dispatch({
              type: 'SET_TARGET_DOT',
              payload: { ...state.targetDot, size: state.targetDot.size },
            });
          }
        },
      },
      0,
    );

    // Then zoom to winner
    if (state.winnerDot) {
      const winnerCamera: Camera3D = {
        position: {
          x: state.winnerDot.x,
          y: state.winnerDot.y,
          z: 2, // Very close zoom
        },
        rotation: { pitch: 0, yaw: 0, roll: 0 },
        fieldOfView: 75,
        near: 0.1,
        far: 50000,
        zoom: 500,
      };

      const winnerPath = generateCameraPath(galaxyCamera, winnerCamera, 120);
      const winnerProxy = { progress: 0 };

      tl.to(
        winnerProxy,
        {
          duration: 8,
          progress: 1,
          ease: 'power3.inOut',
          onUpdate: () => {
            const currentIndex = Math.floor(winnerProxy.progress * (winnerPath.length - 1));
            const currentCamera = winnerPath[currentIndex];

            updateCamera3D(currentCamera);
            updateCamera2D({
              x: currentCamera.position.x,
              y: currentCamera.position.y,
              zoom: currentCamera.zoom,
            });
          },
        },
        4,
      ); // Start after galaxy zoom
    }

    dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: tl } });
  }, [
    state.targetDot,
    state.winnerDot,
    camera3D,
    updateCamera3D,
    updateCamera2D,
    goToScene,
    dispatch,
  ]);

  const transitionToLifetime = useCallback(() => {
    goToScene('none', true);

    const starFieldEngine = document.querySelector('.star-field-engine') as HTMLElement;
    const lifetimeScene = document.querySelector('[data-scene="lifetime"]') as HTMLElement;

    const tl = gsap.timeline({
      onComplete: () => {
        goToScene('lifetime');
      },
    });

    // Fade out the 3D starfield
    if (starFieldEngine) {
      tl.to(starFieldEngine, {
        duration: 3,
        opacity: 0,
        ease: 'power2.inOut',
      });
    }

    // Simultaneously, fade in the lifetime calculator
    if (lifetimeScene) {
      tl.to(
        lifetimeScene,
        {
          duration: 3,
          autoAlpha: 1,
          ease: 'power2.inOut',
        },
        0,
      );
    }

    dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: tl } });
  }, [goToScene, dispatch]);

  // Add cinematic camera movement for enhanced experience
  const addCinematicMovement = useCallback(
    (
      startCamera: Camera3D,
      endCamera: Camera3D,
      duration: number = 8,
      ease: string = 'power2.inOut',
    ) => {
      const path = generateCameraPath(startCamera, endCamera, Math.floor(duration * 15));
      const proxy = { progress: 0 };

      return gsap.to(proxy, {
        duration,
        progress: 1,
        ease,
        onUpdate: () => {
          const currentIndex = Math.floor(proxy.progress * (path.length - 1));
          const currentCamera = path[currentIndex];

          // Add subtle camera shake for cinematic effect
          const shakeIntensity = 0.1;
          const shake = {
            x: (Math.random() - 0.5) * shakeIntensity,
            y: (Math.random() - 0.5) * shakeIntensity,
            z: (Math.random() - 0.5) * shakeIntensity * 0.1,
          };

          const cinematicCamera = {
            ...currentCamera,
            position: {
              x: currentCamera.position.x + shake.x,
              y: currentCamera.position.y + shake.y,
              z: currentCamera.position.z + shake.z,
            },
          };

          updateCamera3D(cinematicCamera);
          updateCamera2D({
            x: cinematicCamera.position.x,
            y: cinematicCamera.position.y,
            zoom: cinematicCamera.zoom,
          });
        },
      });
    },
    [updateCamera3D, updateCamera2D],
  );

  // Smooth camera transition for scene changes
  const smoothTransition = useCallback(
    (targetCamera: Camera3D, duration: number = 2, onComplete?: () => void) => {
      const path = generateCameraPath(camera3D, targetCamera, Math.floor(duration * 15));
      const proxy = { progress: 0 };

      return gsap.to(proxy, {
        duration,
        progress: 1,
        ease: 'power2.inOut',
        onUpdate: () => {
          const currentIndex = Math.floor(proxy.progress * (path.length - 1));
          const currentCamera = path[currentIndex];

          updateCamera3D(currentCamera);
          updateCamera2D({
            x: currentCamera.position.x,
            y: currentCamera.position.y,
            zoom: currentCamera.zoom,
          });
        },
        onComplete,
      });
    },
    [camera3D, updateCamera3D, updateCamera2D],
  );

  return {
    startZoom1Animation,
    startRevealAnimation,
    animateToWinner,
    transitionToLifetime,
    addCinematicMovement,
    smoothTransition,
  };
};
