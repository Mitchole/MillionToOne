import { SceneType } from './animation';

export interface SceneConfig {
  id: SceneType;
  hasAmbientPanning: boolean;
  showCanvas: boolean;
  className?: string;
}

export interface SceneManager {
  currentScene: SceneType;
  previousScene: SceneType | null;
  isTransitioning: boolean;
  goToScene: (sceneId: SceneType, isInstant?: boolean) => void;
}

export interface SceneProps {
  isActive: boolean;
  onSceneChange: (scene: SceneType) => void;
}
