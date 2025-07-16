import React, { useEffect, useState } from 'react';
import { CosmicBackground } from '../background/CosmicBackground';
import { StarFieldEngine3D } from '../starfield/StarFieldEngine3D';
import { SceneManager } from '../scenes/SceneManager';
import { useAppContext } from '../../context/AppContext';
import { createTargetDots3D } from '../../utils/starfield3d';
import { DeviceCapabilityDetector } from '../../utils/performance';
import { useSceneManager } from '../../hooks/useSceneManager';
import { HamburgerMenu } from '../ui/HamburgerMenu';
import { PerformanceTestingLoader } from '../ui/PerformanceTestingLoader';
import { StarQuality, StarStyle } from '../../utils/starMaterials';

export const AppLayout: React.FC = () => {
  const { dispatch, state } = useAppContext();
  const { goToScene } = useSceneManager();
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const [deviceCapabilities, setDeviceCapabilities] = useState<any>(null);
  const [showPerformanceTesting, setShowPerformanceTesting] = useState(false);
  const [performanceTestResults, setPerformanceTestResults] = useState<any[]>([]);

  useEffect(() => {
    // Initialize 3D dots on app start
    const { targetDot, winnerDot } = createTargetDots3D();
    dispatch({
      type: 'SET_TARGET_DOT',
      payload: {
        x: targetDot.position.x,
        y: targetDot.position.y,
        size: targetDot.size,
        color: `#${targetDot.color.getHexString()}`,
      },
    });
    dispatch({
      type: 'SET_WINNER_DOT',
      payload: {
        x: winnerDot.position.x,
        y: winnerDot.position.y,
        size: winnerDot.size,
        color: `#${winnerDot.color.getHexString()}`,
      },
    });

    // Initialize device capabilities and adjust effects
    const initializeCapabilities = async () => {
      try {
        const capabilities = await DeviceCapabilityDetector.detect();
        setDeviceCapabilities(capabilities);

        // Disable effects on very low-end devices
        if (capabilities.isLowEnd || capabilities.performanceScore < 0.3) {
          setEffectsEnabled(false);
        }

        // Show performance testing if needed
        setShowPerformanceTesting(true);
      } catch (error) {
        console.warn('Failed to detect device capabilities:', error);
        // Conservative approach - enable effects but be ready to disable
        setEffectsEnabled(true);
        setShowPerformanceTesting(true);
      }
    };

    initializeCapabilities();
  }, [dispatch]);

  // Performance testing callbacks
  const handlePerformanceTestingComplete = (results: any[]) => {
    setPerformanceTestResults(results);
    console.log('🎯 AppLayout: Performance testing complete', results);
  };

  const handleOptimalSettingsSelected = (quality: StarQuality, style: StarStyle) => {
    console.log('🎯 AppLayout: Optimal settings selected', { quality, style });
    // Settings are automatically applied by the StarQualityManager
  };

  // Determine if we should show effects based on scene and device capabilities
  const shouldShowEffects =
    effectsEnabled &&
    (state.currentScene === 'zoom1' ||
      state.currentScene === 'zoom2' ||
      state.currentScene === 'your-choice' ||
      state.currentScene === 'winner-reveal');

  return (
    <div className="w-full h-screen relative">
      <CosmicBackground />
      <StarFieldEngine3D className="star-field-engine" style={{ zIndex: 0 }} />

      <div className="relative z-10">
        <SceneManager />
      </div>

      {/* Hamburger Menu */}
      <HamburgerMenu />

      {/* Performance Testing Loader */}
      {showPerformanceTesting && (
        <PerformanceTestingLoader
          onTestingComplete={handlePerformanceTestingComplete}
          onOptimalSettingsSelected={handleOptimalSettingsSelected}
          skipIfCached={true}
        />
      )}
    </div>
  );
};
