import React from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { GlassPanel } from '../ui/GlassPanel';
import { useSceneManager } from '../../hooks/useSceneManager';
import { useZoomAnimations3D } from '../../hooks/useZoomAnimations3D';

export const YourChoiceScene: React.FC = () => {
  const { currentScene } = useSceneManager();
  const { animateToWinner } = useZoomAnimations3D();

  return (
    <SceneTransition
      sceneId="your-choice"
      isActive={currentScene === 'your-choice'}
      className="items-end pb-[20%]"
    >
      <GlassPanel size="sm" className="m-8 text-center">
        <h2 className="text-2xl font-bold text-white">This Is Your Choice</h2>
        <p className="mt-4 text-gray-300">
          Its position in this universe is determined by the numbers you picked.
        </p>
        <button
          onClick={animateToWinner}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
        >
          See The Winning Number
        </button>
      </GlassPanel>
    </SceneTransition>
  );
};
