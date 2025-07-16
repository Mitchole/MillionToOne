import React, { useState, useEffect } from 'react';
import { getStarQualityManager } from '../../utils/starQualityManager';
import { StarQuality, StarStyle } from '../../utils/starMaterials';
import { clearStarSettings, hasStarSettings } from '../../utils/starSettingsPersistence';
import { useSceneManager } from '../../hooks/useSceneManager';
import DevTestingPanel from './DevTestingPanel';

interface HamburgerMenuProps {
  className?: string;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [currentSettings, setCurrentSettings] = useState<any>(null);
  const [hasCache, setHasCache] = useState(false);
  const [showDevTesting, setShowDevTesting] = useState(false);
  const { goToScene } = useSceneManager();

  const qualityManager = getStarQualityManager();

  // Update performance stats
  useEffect(() => {
    const updateStats = () => {
      setPerformanceStats(qualityManager.getPerformanceStats());
      setCurrentSettings(qualityManager.getCurrentSettings());
      setHasCache(hasStarSettings());
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [qualityManager]);

  const handleQualityChange = (quality: StarQuality, style: StarStyle) => {
    qualityManager.setQuality(quality, style);
    setCurrentSettings(qualityManager.getCurrentSettings());
  };

  const handleAutoMode = () => {
    qualityManager.enableAutomatic();
    setCurrentSettings(qualityManager.getCurrentSettings());
  };

  const handleClearCache = () => {
    clearStarSettings();
    setHasCache(false);
    // Optionally reload the page to restart with fresh settings
    if (
      window.confirm(
        'Cache cleared! Would you like to reload the page to restart performance testing?',
      )
    ) {
      window.location.reload();
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOpen) {
        if (event.key === 'Escape') {
          closeMenu();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const qualityOptions = [
    { quality: 'low' as StarQuality, style: 'basic' as StarStyle, label: 'Low (Basic)' },
    {
      quality: 'medium' as StarQuality,
      style: 'procedural' as StarStyle,
      label: 'Medium (Procedural)',
    },
    {
      quality: 'high' as StarQuality,
      style: 'procedural' as StarStyle,
      label: 'High (Procedural)',
    },
    { quality: 'high' as StarQuality, style: 'texture' as StarStyle, label: 'High (Texture)' },
  ];

  const isCurrentSetting = (quality: StarQuality, style: StarStyle) => {
    return currentSettings?.quality === quality && currentSettings?.style === style;
  };

  const getQualityColor = (quality: StarQuality) => {
    switch (quality) {
      case 'low':
        return 'text-yellow-400';
      case 'medium':
        return 'text-blue-400';
      case 'high':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="relative w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 opacity-20 hover:opacity-100 focus:opacity-100"
        title="Star Settings & Performance"
        aria-label="Open star settings and performance menu"
        aria-expanded={isOpen}
        aria-controls="star-settings-menu"
        aria-haspopup="true"
      >
        <div className="absolute inset-0 flex flex-col justify-center items-center">
          <div
            className={`w-5 h-0.5 bg-white transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1' : ''}`}
          />
          <div
            className={`w-5 h-0.5 bg-white mt-1 transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}
          />
          <div
            className={`w-5 h-0.5 bg-white mt-1 transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1' : ''}`}
          />
        </div>
      </button>

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 -z-10" onClick={closeMenu} />}

      {/* Menu Panel */}
      <div
        id="star-settings-menu"
        className={`absolute top-12 right-0 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
        role="menu"
        aria-label="Star settings and performance menu"
        aria-hidden={!isOpen}
      >
        <div className="p-4">
          <h3
            className="text-white font-semibold mb-4 flex items-center"
            role="heading"
            aria-level={3}
          >
            <span className="text-purple-400 mr-2" aria-hidden="true">
              ⚙️
            </span>
            Star Settings & Performance
          </h3>

          {/* Performance Stats */}
          <div className="bg-gray-800 rounded-lg p-3 mb-4">
            <h4 className="text-gray-300 font-medium mb-2">Performance Monitor</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">FPS:</span>
                <span className={getFpsColor(performanceStats?.avgFps || 0)}>
                  {performanceStats?.avgFps ? Math.round(performanceStats.avgFps) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory:</span>
                <span className="text-white">
                  {performanceStats?.memoryUsage ? Math.round(performanceStats.memoryUsage) : 0} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mode:</span>
                <span
                  className={currentSettings?.isAutomatic ? 'text-blue-400' : 'text-orange-400'}
                >
                  {currentSettings?.isAutomatic ? 'Auto' : 'Manual'}
                </span>
              </div>
              {currentSettings?.fallbackTriggered && (
                <div className="text-red-400 text-xs">⚠️ Fallback triggered</div>
              )}
            </div>
          </div>

          {/* Quality Selection */}
          <div className="mb-4">
            <h4 className="text-gray-300 font-medium mb-2">Star Quality</h4>

            {/* Auto Mode Button */}
            <button
              onClick={handleAutoMode}
              className={`w-full mb-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentSettings?.isAutomatic
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              role="menuitem"
              aria-label="Enable automatic quality adjustment"
              aria-pressed={currentSettings?.isAutomatic}
            >
              <span aria-hidden="true">🤖</span> Auto (Recommended)
            </button>

            {/* Manual Quality Options */}
            <div className="space-y-1" role="group" aria-label="Manual quality options">
              {qualityOptions.map((option) => (
                <button
                  key={`${option.quality}-${option.style}`}
                  onClick={() => handleQualityChange(option.quality, option.style)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    isCurrentSetting(option.quality, option.style) && !currentSettings?.isAutomatic
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  role="menuitem"
                  aria-label={`Set quality to ${option.label}`}
                  aria-pressed={
                    isCurrentSetting(option.quality, option.style) && !currentSettings?.isAutomatic
                  }
                >
                  <span className={getQualityColor(option.quality)} aria-hidden="true">
                    ●
                  </span>{' '}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cache Management */}
          <div className="mb-4">
            <h4 className="text-gray-300 font-medium mb-2">Cache</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Settings cached: {hasCache ? 'Yes' : 'No'}
              </span>
              <button
                onClick={handleClearCache}
                disabled={!hasCache}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  hasCache
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
                role="menuitem"
                aria-label="Clear cached settings"
                aria-disabled={!hasCache}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Dev Tools */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-gray-300 font-medium mb-2" role="heading" aria-level={4}>
              Dev Tools
            </h4>
            <div className="space-y-2" role="group" aria-label="Development tools">
              <button
                onClick={() => {
                  setShowDevTesting(true);
                  closeMenu();
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium"
                role="menuitem"
                aria-label="Open performance testing panel"
              >
                <span aria-hidden="true">🧪</span> Performance Testing
              </button>
              <button
                onClick={() => {
                  goToScene('star-demo');
                  closeMenu();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
                role="menuitem"
                aria-label="Go to star demo scene"
              >
                <span aria-hidden="true">🌟</span> Star Demo
              </button>
              <button
                onClick={() => {
                  goToScene('landing');
                  closeMenu();
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium"
                role="menuitem"
                aria-label="Return to main application"
              >
                <span aria-hidden="true">🏠</span> Back to App
              </button>
            </div>
          </div>

          {/* Current Settings Summary */}
          <div className="bg-gray-800 rounded-lg p-3 mt-4">
            <h4 className="text-gray-300 font-medium mb-2" role="heading" aria-level={4}>
              Current Settings
            </h4>
            <div className="text-sm space-y-1" role="status" aria-live="polite">
              <div className="flex justify-between">
                <span className="text-gray-400">Quality:</span>
                <span className={getQualityColor(currentSettings?.quality || 'low')}>
                  {currentSettings?.quality || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Style:</span>
                <span className="text-white capitalize">{currentSettings?.style || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dev Testing Panel */}
      <DevTestingPanel isVisible={showDevTesting} onClose={() => setShowDevTesting(false)} />
    </div>
  );
};

export default HamburgerMenu;
