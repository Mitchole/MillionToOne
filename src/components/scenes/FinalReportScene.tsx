import React from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { GlassPanel } from '../ui/GlassPanel';
import { useSceneManager } from '../../hooks/useSceneManager';
import { useLifetimeCalculator } from '../../context/LifetimeCalculatorContext';
import { formatCurrency, formatLargeNumber } from '../../utils/lottery';

export const FinalReportScene: React.FC = () => {
  const { currentScene, resetToLanding } = useSceneManager();
  const { calculation } = useLifetimeCalculator();

  if (!calculation) {
    return (
      <SceneTransition sceneId="report" isActive={currentScene === 'report'}>
        <GlassPanel>
          <div className="text-center">
            <p className="text-white">Calculating your lifetime statistics...</p>
          </div>
        </GlassPanel>
      </SceneTransition>
    );
  }

  const yearlySpend = calculation.linesPerWeek * 2 * 52 * 2.5; // 2 draws per week, £2.50 per line
  const tenYearSpend = yearlySpend * 10;

  return (
    <SceneTransition
      sceneId="report"
      isActive={currentScene === 'report'}
      className="overflow-y-auto"
    >
      <div className="w-full max-w-5xl my-auto">
        <GlassPanel size="xl" padding="lg">
          <h2 className="text-4xl font-bold text-white text-center mb-8">Your Sobering Report</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Costs and Odds */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-purple-300">Your Lifetime Investment</h3>
                <div className="mt-3 space-y-2 text-lg">
                  <p className="flex justify-between">
                    <span>In 1 Year:</span>
                    <span className="font-bold text-white">{formatCurrency(yearlySpend)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>In 10 Years:</span>
                    <span className="font-bold text-white">{formatCurrency(tenYearSpend)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Over Your Lifetime:</span>
                    <span className="font-bold text-white">
                      {formatCurrency(calculation.lifetimeSpend)}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-red-400">The Harsh Reality</h3>
                <div className="mt-3 space-y-2 text-lg">
                  <p className="flex justify-between">
                    <span>Avg. Years to Win:</span>
                    <span className="font-bold text-white">
                      {formatLargeNumber(calculation.yearsToWin)}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Age When You Win:</span>
                    <span className="font-bold text-white">
                      {formatLargeNumber(calculation.ageAtWin)} years old
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Net Outcome (Lifetime):</span>
                    <span className="font-bold text-red-300">
                      {formatCurrency(calculation.netOutcome)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: What Else? */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-yellow-300">
                  What Else You Could Afford
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-3xl">🚗</p>
                    <p className="mt-2 font-semibold">A New Car</p>
                    <p className="text-sm text-gray-400">({formatCurrency(tenYearSpend * 2)})</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-3xl">✈️</p>
                    <p className="mt-2 font-semibold">Luxury Holiday</p>
                    <p className="text-sm text-gray-400">({formatCurrency(tenYearSpend)})</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-3xl">💻</p>
                    <p className="mt-2 font-semibold">High-End Laptop</p>
                    <p className="text-sm text-gray-400">({formatCurrency(yearlySpend * 5)})</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-lg">
                    <p className="text-3xl">☕</p>
                    <p className="mt-2 font-semibold">Daily Coffee</p>
                    <p className="text-sm text-gray-400">({formatCurrency(yearlySpend)})</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={resetToLanding}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Start Over
            </button>
          </div>
        </GlassPanel>
      </div>
    </SceneTransition>
  );
};
