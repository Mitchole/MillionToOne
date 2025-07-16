import React, { useEffect, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { SceneType } from '../../types';
import { createSceneTransition, applyReducedMotionConfig } from '../../utils/animation';

interface SceneTransitionProps {
  children: React.ReactNode;
  sceneId: SceneType;
  isActive: boolean;
  className?: string;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  children,
  sceneId,
  isActive,
  className = '',
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<boolean>(isActive);

  useGSAP(() => {
    if (!sceneRef.current) return;

    const element = sceneRef.current;
    const wasActive = previousActiveRef.current;

    if (isActive && !wasActive) {
      // Scene becoming active
      const config = applyReducedMotionConfig({ duration: 0.7, ease: 'power2.inOut' });
      createSceneTransition(null, element, config);
    } else if (!isActive && wasActive) {
      // Scene becoming inactive
      const config = applyReducedMotionConfig({ duration: 0.7, ease: 'power2.inOut' });
      createSceneTransition(element, null, config);
    }

    previousActiveRef.current = isActive;
  }, [isActive]);

  // Set initial visibility
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.style.visibility = isActive ? 'visible' : 'hidden';
      sceneRef.current.style.opacity = isActive ? '1' : '0';
    }
  }, []);

  return (
    <div
      ref={sceneRef}
      className={`ui-layer ${className}`}
      data-scene={sceneId}
      style={{
        visibility: isActive ? 'visible' : 'hidden',
        opacity: isActive ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
};
