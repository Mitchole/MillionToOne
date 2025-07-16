import React from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { GlassPanel } from '../ui/GlassPanel';
import { NumberPicker } from '../ui/NumberPicker';
import { useSceneManager } from '../../hooks/useSceneManager';

export const NumberPickerScene: React.FC = () => {
  const { currentScene, goToScene } = useSceneManager();

  const handleConfirm = () => {
    goToScene('zoom1');
  };

  return (
    <SceneTransition sceneId="ticket" isActive={currentScene === 'ticket'}>
      <GlassPanel size="xl">
        <NumberPicker onConfirm={handleConfirm} />
      </GlassPanel>
    </SceneTransition>
  );
};
