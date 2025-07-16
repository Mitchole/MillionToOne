import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { SceneType } from '../types';
import { SCENE_CONFIGS } from '../utils/animation';

export const useSceneManager = () => {
  const { state, dispatch } = useAppContext();

  const goToScene = useCallback(
    (sceneId: SceneType, isInstant: boolean = false) => {
      dispatch({ type: 'SET_SCENE', payload: { scene: sceneId, isInstant } });
    },
    [dispatch],
  );

  const getCurrentSceneConfig = useCallback(() => {
    return SCENE_CONFIGS[state.currentScene];
  }, [state.currentScene]);

  const shouldShowCanvas = useCallback(() => {
    return getCurrentSceneConfig().showCanvas;
  }, [getCurrentSceneConfig]);

  const shouldHaveAmbientPanning = useCallback(() => {
    return getCurrentSceneConfig().hasAmbientPanning;
  }, [getCurrentSceneConfig]);

  const resetToLanding = useCallback(() => {
    dispatch({ type: 'SET_SCENE', payload: { scene: 'landing' } });
    dispatch({ type: 'SET_CAMERA', payload: { x: 0, y: 0, zoom: 1 } });
    dispatch({ type: 'SET_LOTTERY_NUMBERS', payload: { main: [], lucky: [] } });
    dispatch({ type: 'RESET_DOTS' });
  }, [dispatch]);

  return {
    currentScene: state.currentScene,
    previousScene: state.previousScene,
    isTransitioning: state.isTransitioning,
    goToScene,
    getCurrentSceneConfig,
    shouldShowCanvas,
    shouldHaveAmbientPanning,
    resetToLanding,
  };
};
