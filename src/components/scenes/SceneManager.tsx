import React, { Suspense } from 'react';
import { LandingScene } from './LandingScene';
import { NumberPickerScene } from './NumberPickerScene';
import { ZoomScene1 } from './ZoomScene1';
import { ZoomScene2 } from './ZoomScene2';
import { YourChoiceScene } from './YourChoiceScene';
import { WinnerRevealScene } from './WinnerRevealScene';
import { LifetimeCalculatorScene } from './LifetimeCalculatorScene';
import { FinalReportScene } from './FinalReportScene';
import { StarStylesDemo } from '../dev/StarStylesDemo';
import { useSceneManager } from '../../hooks/useSceneManager';

const LoadingFallback: React.FC = () => (
  <div className="ui-layer">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
      <p className="mt-4 text-white">Loading...</p>
    </div>
  </div>
);

export const SceneManager: React.FC = () => {
  const { currentScene } = useSceneManager();

  return (
    <Suspense fallback={<LoadingFallback />}>
      {/* Landing Scene */}
      <LandingScene />

      {/* Number Picker Scene */}
      <NumberPickerScene />

      {/* Zoom Scenes */}
      <ZoomScene1 />
      <ZoomScene2 />

      {/* Choice and Reveal Scenes */}
      <YourChoiceScene />
      <WinnerRevealScene />

      {/* Calculator and Report Scenes */}
      <LifetimeCalculatorScene />
      <FinalReportScene />

      {/* Dev Tools */}
      <StarStylesDemo />
    </Suspense>
  );
};
