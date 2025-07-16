import React from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { GlassPanel } from '../ui/GlassPanel';
import { useSceneManager } from '../../hooks/useSceneManager';
import { useZoomAnimations3D } from '../../hooks/useZoomAnimations3D';

export const WinnerRevealScene: React.FC = () => {
  const { currentScene } = useSceneManager();
  const { transitionToLifetime } = useZoomAnimations3D();

  return (
    <SceneTransition
      sceneId="winner-reveal"
      isActive={currentScene === 'winner-reveal'}
      className="items-end pb-[20%]"
    >
      <GlassPanel size="sm" className="m-8 text-center">
        <h2 className="text-2xl font-bold text-white">The Winning Number</h2>
        <p className="mt-4 text-gray-300">
          Unfortunately, the winning combination was over here, in another part of the universe.
        </p>
        <button
          onClick={transitionToLifetime}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          OK
        </button>
      </GlassPanel>
    </SceneTransition>
  );
};
