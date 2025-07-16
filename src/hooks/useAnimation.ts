import { useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { createAmbientPan, createGSAPContext, killAllAnimations } from '../utils/animation';
import { useSceneManager } from './useSceneManager';
import { useCamera } from './useCamera';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export const useAnimation = () => {
  const { state, dispatch } = useAppContext();
  const { shouldHaveAmbientPanning } = useSceneManager();
  const { camera, updateCamera } = useCamera();
  const contextRef = useRef<gsap.Context>();

  // Initialize GSAP context
  useGSAP(() => {
    contextRef.current = createGSAPContext();
    return () => {
      if (contextRef.current) {
        contextRef.current.kill();
      }
    };
  });

  const startAmbientPanning = useCallback(() => {
    if (state.animation.ambientPanTween) {
      state.animation.ambientPanTween.kill();
    }

    const onUpdate = () => {
      // Update will be handled by camera state change
    };

    const tween = createAmbientPan(camera, onUpdate);
    dispatch({ type: 'SET_ANIMATION', payload: { ambientPanTween: tween } });
  }, [camera, dispatch, state.animation.ambientPanTween]);

  const stopAmbientPanning = useCallback(() => {
    if (state.animation.ambientPanTween) {
      state.animation.ambientPanTween.kill();
      dispatch({ type: 'SET_ANIMATION', payload: { ambientPanTween: null } });
    }
  }, [dispatch, state.animation.ambientPanTween]);

  const createTimeline = useCallback(() => {
    const tl = gsap.timeline();
    dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: tl } });
    return tl;
  }, [dispatch]);

  const killCurrentTimeline = useCallback(() => {
    if (state.animation.currentTimeline) {
      state.animation.currentTimeline.kill();
      dispatch({ type: 'SET_ANIMATION', payload: { currentTimeline: null } });
    }
  }, [dispatch, state.animation.currentTimeline]);

  const killAllTweens = useCallback(() => {
    killAllAnimations();
    dispatch({
      type: 'SET_ANIMATION',
      payload: { currentTimeline: null, ambientPanTween: null },
    });
  }, [dispatch]);

  // Handle ambient panning based on scene
  useEffect(() => {
    if (shouldHaveAmbientPanning()) {
      startAmbientPanning();
    } else {
      stopAmbientPanning();
    }
  }, [shouldHaveAmbientPanning, startAmbientPanning, stopAmbientPanning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      killAllTweens();
    };
  }, [killAllTweens]);

  return {
    isPlaying: state.animation.isPlaying,
    currentTimeline: state.animation.currentTimeline,
    ambientPanTween: state.animation.ambientPanTween,
    startAmbientPanning,
    stopAmbientPanning,
    createTimeline,
    killCurrentTimeline,
    killAllTweens,
  };
};
