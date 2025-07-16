import React from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { useSceneManager } from '../../hooks/useSceneManager';
import { useNumberPicker } from '../../hooks/useNumberPicker';

export const LandingScene: React.FC = () => {
  const { currentScene, goToScene } = useSceneManager();
  const { resetSelection } = useNumberPicker();

  const handleBegin = () => {
    resetSelection();
    goToScene('ticket');
  };

  return (
    <SceneTransition sceneId="landing" isActive={currentScene === 'landing'}>
      <div className="text-center">
        <h1 className="text-6xl md:text-8xl font-extrabold text-white tracking-tight">
          MillionToOne
        </h1>
        <p className="mt-4 text-xl text-gray-400">
          A visual journey into the odds of winning the lottery.
        </p>
        <button
          onClick={handleBegin}
          className="mt-8 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all"
        >
          Begin
        </button>
      </div>
    </SceneTransition>
  );
};
