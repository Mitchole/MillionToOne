import React from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { GlassPanel } from '../ui/GlassPanel';
import { useSceneManager } from '../../hooks/useSceneManager';
import { useZoomAnimations3D } from '../../hooks/useZoomAnimations3D';

export const ZoomScene2: React.FC = () => {
  const { currentScene } = useSceneManager();
  const { startRevealAnimation } = useZoomAnimations3D();

  return (
    <SceneTransition
      sceneId="zoom2"
      isActive={currentScene === 'zoom2'}
      className="justify-end lg:justify-start"
    >
      <GlassPanel size="sm" className="m-8">
        <h2 className="text-2xl font-bold text-white">Closer...</h2>
        <p className="mt-4 text-gray-300">
          Even from this closer perspective, the sheer number of combinations is vast. Your single
          ticket is one of these points of light.
        </p>
        <button
          onClick={() => startRevealAnimation()}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          Find My Dot
        </button>
      </GlassPanel>
    </SceneTransition>
  );
};
