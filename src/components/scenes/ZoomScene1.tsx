import React from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { GlassPanel } from '../ui/GlassPanel';
import { useSceneManager } from '../../hooks/useSceneManager';
import { useZoomAnimations3D } from '../../hooks/useZoomAnimations3D';

export const ZoomScene1: React.FC = () => {
  const { currentScene } = useSceneManager();
  const { startZoom1Animation } = useZoomAnimations3D();

  return (
    <SceneTransition
      sceneId="zoom1"
      isActive={currentScene === 'zoom1'}
      className="justify-start lg:justify-end"
    >
      <GlassPanel size="sm" className="m-8">
        <h2 className="text-2xl font-bold text-white">A Sea of Possibilities</h2>
        <p className="mt-4 text-gray-300">
          Each glowing dot in this universe represents a possible jackpot combination. Let's zoom in
          to find yours.
        </p>
        <button
          onClick={() => {
            console.log('Next button clicked in ZoomScene1');
            startZoom1Animation();
          }}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          Next
        </button>
      </GlassPanel>
    </SceneTransition>
  );
};
