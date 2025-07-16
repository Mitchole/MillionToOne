import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useCamera } from './useCamera';
import { useSceneManager } from './useSceneManager';
import { useGSAP } from '@gsap/react';
import { createZoomAnimation, createWinnerRevealAnimation } from '../utils/animation';
import { starPreloader } from '../utils/starPreloader';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export const useZoomAnimations = () => {
  const { state, dispatch } = useAppContext();
  const { camera, updateCamera } = useCamera();
  const { goToScene } = useSceneManager();

  const startZoom1Animation = useCallback(() => {
    if (!state.targetDot) return;

    goToScene('none');

    const targetX = state.targetDot.x * 0.25;
    const targetY = state.targetDot.y * 0.25;
    const targetZoom = 10;

    // Preload stars along zoom trajectory
    starPreloader.predictZoomPath(
      state.camera,
      { x: targetX, y: targetY, zoom: targetZoom },
      8000, // 8 second duration
    );

    const tl = gsap.timeline({
      onComplete: () => {
        goToScene('zoom2', true);
      },
    });

    tl.to(state.camera, {
      duration: 8,
      zoom: targetZoom,
      x: targetX,
      y: targetY,
      ease: 'power2.inOut',
      onUpdate: () => {
        updateCamera({ x: state.camera.x, y: state.camera.y, zoom: state.camera.zoom });
        // Preload around current position during animation
        starPreloader.preloadAroundPosition(state.camera, 1, 0.5);
      },
    });

    dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: tl } });
  }, [state.targetDot, state.camera, updateCamera, goToScene, dispatch]);

  const startRevealAnimation = useCallback(
    (targetZoom: number = 500) => {
      if (!state.targetDot) return;

      goToScene('none');

      // Preload stars for deep zoom
      starPreloader.predictZoomPath(
        camera,
        { x: state.targetDot.x, y: state.targetDot.y, zoom: targetZoom },
        8000, // 8 second duration
      );

      const tl = gsap.timeline({
        onUpdate: () => {
          // The camera state updates will trigger canvas redraws
        },
        onComplete: () => {
          goToScene('your-choice', true);
        },
      });

      tl.to(camera, {
        duration: 8,
        zoom: targetZoom,
        x: state.targetDot.x,
        y: state.targetDot.y,
        ease: 'power3.inOut',
        onUpdate: () => {
          updateCamera({ ...camera });
          // Preload around current position during deep zoom
          starPreloader.preloadAroundPosition(camera, 2, 0.8);
        },
      });

      dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: tl } });
    },
    [state.targetDot, camera, updateCamera, goToScene, dispatch],
  );

  const animateToWinner = useCallback(() => {
    if (!state.targetDot || !state.winnerDot) return;

    goToScene('none', true);

    const tl = gsap.timeline({
      onUpdate: () => {
        // The camera state updates will trigger canvas redraws
      },
      onComplete: () => {
        goToScene('winner-reveal', true);
      },
    });

    // Zoom out to galaxy view
    tl.to(
      camera,
      {
        duration: 4,
        x: 0,
        y: 0,
        zoom: 1,
        ease: 'power2.inOut',
        onUpdate: () => {
          updateCamera({ ...camera });
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

    // Zoom to winner
    if (state.winnerDot) {
      // Preload stars for winner zoom
      starPreloader.predictZoomPath(
        { x: 0, y: 0, zoom: 1 },
        { x: state.winnerDot.x, y: state.winnerDot.y, zoom: 500 },
        8000,
      );

      tl.to(camera, {
        duration: 8,
        x: state.winnerDot.x,
        y: state.winnerDot.y,
        zoom: 500,
        ease: 'power3.inOut',
        onUpdate: () => {
          updateCamera({ ...camera });
          // Preload around winner position
          starPreloader.preloadAroundPosition(camera, 2, 0.8);
        },
      });
    }

    dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: tl } });
  }, [state.targetDot, state.winnerDot, camera, updateCamera, goToScene, dispatch]);

  const transitionToLifetime = useCallback(() => {
    goToScene('none', true);

    const zoomCanvas = document.querySelector('.zoom-canvas') as HTMLCanvasElement;
    const lifetimeScene = document.querySelector('[data-scene="lifetime"]') as HTMLElement;

    const tl = gsap.timeline({
      onComplete: () => {
        goToScene('lifetime');
      },
    });

    // Fade out the zoomable starfield
    if (zoomCanvas) {
      tl.to(zoomCanvas, {
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

  return {
    startZoom1Animation,
    startRevealAnimation,
    animateToWinner,
    transitionToLifetime,
  };
};
