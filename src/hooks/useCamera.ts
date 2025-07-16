import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { CameraState } from '../types';

export const useCamera = () => {
  const { state, dispatch } = useAppContext();

  const updateCamera = useCallback(
    (updates: Partial<CameraState>) => {
      dispatch({ type: 'SET_CAMERA', payload: updates });
    },
    [dispatch],
  );

  const resetCamera = useCallback(() => {
    dispatch({ type: 'SET_CAMERA', payload: { x: 0, y: 0, zoom: 1 } });
  }, [dispatch]);

  const zoomToTarget = useCallback(
    (target: { x: number; y: number }, zoom: number) => {
      dispatch({ type: 'SET_CAMERA', payload: { x: target.x, y: target.y, zoom } });
    },
    [dispatch],
  );

  const panCamera = useCallback(
    (deltaX: number, deltaY: number) => {
      dispatch({
        type: 'SET_CAMERA',
        payload: { x: state.camera.x + deltaX, y: state.camera.y + deltaY },
      });
    },
    [dispatch, state.camera.x, state.camera.y],
  );

  return {
    camera: state.camera,
    updateCamera,
    resetCamera,
    zoomToTarget,
    panCamera,
  };
};
