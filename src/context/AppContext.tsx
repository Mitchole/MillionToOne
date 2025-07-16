import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { CameraState, Camera3D, LotteryNumbers, SceneType, AnimationState } from '../types';
import { LifetimeCalculatorProvider } from './LifetimeCalculatorContext';

interface AppState {
  currentScene: SceneType;
  previousScene: SceneType | null;
  isTransitioning: boolean;
  camera: CameraState;
  camera3D: Camera3D;
  lotteryNumbers: LotteryNumbers;
  animation: AnimationState;
  targetDot: { x: number; y: number; size: number; color: string } | null;
  winnerDot: { x: number; y: number; size: number; color: string } | null;
}

type AppAction =
  | { type: 'SET_SCENE'; payload: { scene: SceneType; isInstant?: boolean } }
  | { type: 'SET_CAMERA'; payload: Partial<CameraState> }
  | { type: 'SET_CAMERA_3D'; payload: Partial<Camera3D> }
  | { type: 'SET_LOTTERY_NUMBERS'; payload: LotteryNumbers }
  | { type: 'SET_ANIMATION'; payload: Partial<AnimationState> }
  | { type: 'SET_TARGET_DOT'; payload: { x: number; y: number; size: number; color: string } }
  | { type: 'SET_WINNER_DOT'; payload: { x: number; y: number; size: number; color: string } }
  | { type: 'RESET_DOTS' };

const initialState: AppState = {
  currentScene: 'landing',
  previousScene: null,
  isTransitioning: false,
  camera: { x: 0, y: 0, zoom: 1 },
  camera3D: {
    position: { x: 0, y: 0, z: 1000 },
    rotation: { pitch: 0, yaw: 0, roll: 0 },
    fieldOfView: 75,
    near: 0.1,
    far: 50000,
    zoom: 1,
  },
  lotteryNumbers: { main: [], lucky: [] },
  animation: {
    isPlaying: false,
    currentTimeline: null,
    ambientPanTween: null,
  },
  targetDot: null,
  winnerDot: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_SCENE':
      return {
        ...state,
        previousScene: state.currentScene,
        currentScene: action.payload.scene,
        isTransitioning: !action.payload.isInstant,
      };
    case 'SET_CAMERA':
      return {
        ...state,
        camera: { ...state.camera, ...action.payload },
      };
    case 'SET_CAMERA_3D':
      return {
        ...state,
        camera3D: { ...state.camera3D, ...action.payload },
      };
    case 'SET_LOTTERY_NUMBERS':
      return {
        ...state,
        lotteryNumbers: action.payload,
      };
    case 'SET_ANIMATION':
      return {
        ...state,
        animation: { ...state.animation, ...action.payload },
      };
    case 'SET_TARGET_DOT':
      return {
        ...state,
        targetDot: action.payload,
      };
    case 'SET_WINNER_DOT':
      return {
        ...state,
        winnerDot: action.payload,
      };
    case 'RESET_DOTS':
      return {
        ...state,
        targetDot: state.targetDot ? { ...state.targetDot, size: 1 } : null,
        winnerDot: state.winnerDot ? { ...state.winnerDot, size: 1 } : null,
      };
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <LifetimeCalculatorProvider>{children}</LifetimeCalculatorProvider>
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
