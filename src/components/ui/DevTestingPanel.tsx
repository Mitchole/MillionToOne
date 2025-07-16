import React, { useState, useEffect } from 'react';
import { getStarQualityManager } from '../../utils/starQualityManager';
import { StarQuality, StarStyle } from '../../utils/starMaterials';
import { clearStarSettings } from '../../utils/starSettingsPersistence';

interface DevTestingPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

interface ComparisonTest {
  id: string;
  quality: StarQuality;
  style: StarStyle;
  duration: number;
  averageFps: number;
  memoryUsage: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: number;
}

export const DevTestingPanel: React.FC<DevTestingPanelProps> = ({ isVisible, onClose }) => {
  const [activeTest, setActiveTest] = useState<ComparisonTest | null>(null);
  const [testResults, setTestResults] = useState<ComparisonTest[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [octreeStats, setOctreeStats] = useState<any>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);

  const qualityManager = getStarQualityManager();

  // Test configurations for comparison
  const testConfigurations: Omit<
    ComparisonTest,
    'averageFps' | 'memoryUsage' | 'status' | 'timestamp'
  >[] = [
    { id: 'low-basic', quality: 'low', style: 'basic', duration: 3000 },
    { id: 'medium-procedural', quality: 'medium', style: 'procedural', duration: 3000 },
    { id: 'high-procedural', quality: 'high', style: 'procedural', duration: 3000 },
    { id: 'high-texture', quality: 'high', style: 'texture', duration: 3000 },
  ];

  // Update stats periodically
  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      setPerformanceStats(qualityManager.getPerformanceStats());
      // Note: octreeStats would come from StarFieldEngine3D if we had access to it
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [isVisible, qualityManager]);

  const runSingleTest = async (config: (typeof testConfigurations)[0]): Promise<ComparisonTest> => {
    const testResult: ComparisonTest = {
      ...config,
      averageFps: 0,
      memoryUsage: 0,
      status: 'running',
      timestamp: Date.now(),
    };

    setActiveTest(testResult);

    try {
      // Apply test configuration
      qualityManager.setQuality(config.quality, config.style);

      // Allow system to stabilize
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Run test for specified duration
      const startTime = Date.now();
      const fpsReadings: number[] = [];
      let lastTime = startTime;

      const collectMetrics = () => {
        const now = Date.now();
        const deltaTime = now - lastTime;
        const fps = 1000 / Math.max(deltaTime, 1);

        if (fps > 0 && fps < 200) {
          fpsReadings.push(fps);
        }

        lastTime = now;

        if (now - startTime < config.duration) {
          requestAnimationFrame(collectMetrics);
        }
      };

      return new Promise((resolve) => {
        requestAnimationFrame(collectMetrics);

        setTimeout(() => {
          const avgFps =
            fpsReadings.length > 0
              ? fpsReadings.reduce((sum, fps) => sum + fps, 0) / fpsReadings.length
              : 0;

          const memoryUsage = qualityManager.getPerformanceStats().memoryUsage;

          const completedTest: ComparisonTest = {
            ...testResult,
            averageFps: Math.round(avgFps * 100) / 100,
            memoryUsage: Math.round(memoryUsage * 100) / 100,
            status: avgFps > 5 ? 'completed' : 'failed',
            timestamp: Date.now(),
          };

          resolve(completedTest);
        }, config.duration);
      });
    } catch (error) {
      console.error('Test failed:', error);
      return {
        ...testResult,
        status: 'failed',
        timestamp: Date.now(),
      };
    }
  };

  const runBenchmarkSuite = async () => {
    setIsRunningBenchmark(true);
    setTestResults([]);
    setActiveTest(null);

    const results: ComparisonTest[] = [];

    for (const config of testConfigurations) {
      const result = await runSingleTest(config);
      results.push(result);
      setTestResults([...results]);

      // Short break between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setActiveTest(null);
    setIsRunningBenchmark(false);

    // Return to automatic mode
    qualityManager.enableAutomatic();
  };

  const resetTests = () => {
    setTestResults([]);
    setActiveTest(null);
    setIsRunningBenchmark(false);
  };

  const applyTestConfiguration = (test: ComparisonTest) => {
    qualityManager.setQuality(test.quality, test.style);
  };

  const getStatusColor = (status: ComparisonTest['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'running':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">🧪 Dev Testing Panel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Monitoring */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Real-time Performance</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current FPS:</span>
                <span className={getFpsColor(performanceStats?.avgFps || 0)}>
                  {performanceStats?.avgFps ? Math.round(performanceStats.avgFps) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory Usage:</span>
                <span className="text-white">
                  {performanceStats?.memoryUsage ? Math.round(performanceStats.memoryUsage) : 0} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quality:</span>
                <span className="text-purple-400 capitalize">
                  {performanceStats?.quality || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Style:</span>
                <span className="text-blue-400 capitalize">{performanceStats?.style || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mode:</span>
                <span
                  className={performanceStats?.isAutomatic ? 'text-green-400' : 'text-orange-400'}
                >
                  {performanceStats?.isAutomatic ? 'Auto' : 'Manual'}
                </span>
              </div>
            </div>
          </div>

          {/* Benchmark Controls */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Benchmark Suite</h3>
            <div className="space-y-3">
              <button
                onClick={runBenchmarkSuite}
                disabled={isRunningBenchmark}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  isRunningBenchmark
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRunningBenchmark ? 'Running Benchmark...' : 'Run Full Benchmark'}
              </button>

              <button
                onClick={resetTests}
                disabled={isRunningBenchmark}
                className="w-full px-4 py-2 rounded-lg font-medium bg-gray-600 hover:bg-gray-700 text-white transition-colors"
              >
                Reset Tests
              </button>

              <button
                onClick={() => {
                  clearStarSettings();
                  qualityManager.enableAutomatic();
                }}
                className="w-full px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>

        {/* Active Test Display */}
        {activeTest && (
          <div className="mt-6 bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">
              Currently Testing: {activeTest.quality} quality with {activeTest.style} style
            </h3>
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
              <span className="text-yellow-200">Running for {activeTest.duration / 1000}s...</span>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-3">Test Results</h3>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
                        Configuration
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">FPS</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
                        Memory
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {testResults.map((test) => (
                      <tr key={test.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-2">
                          <div className="text-sm">
                            <div className="text-white font-medium capitalize">
                              {test.quality} - {test.style}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {test.duration / 1000}s test
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={getFpsColor(test.averageFps)}>
                            {test.averageFps || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-white">{test.memoryUsage || 'N/A'} MB</td>
                        <td className="px-4 py-2">
                          <span className={`capitalize ${getStatusColor(test.status)}`}>
                            {test.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => applyTestConfiguration(test)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                          >
                            Apply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Quick Quality Switcher */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Quick Quality Switcher</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {testConfigurations.map((config) => (
              <button
                key={config.id}
                onClick={() => qualityManager.setQuality(config.quality, config.style)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                {config.quality} - {config.style}
              </button>
            ))}
          </div>
          <button
            onClick={() => qualityManager.enableAutomatic()}
            className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
          >
            🤖 Auto Mode
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevTestingPanel;
