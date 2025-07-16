import React, { useState } from 'react';
import { SceneTransition } from '../ui/SceneTransition';
import { GlassPanel } from '../ui/GlassPanel';
import { useSceneManager } from '../../hooks/useSceneManager';
import { useLifetimeCalculator } from '../../context/LifetimeCalculatorContext';
import { calculateLifetimeStats } from '../../utils/lottery';

export const LifetimeCalculatorScene: React.FC = () => {
  const { currentScene, goToScene } = useSceneManager();
  const { setCalculation } = useLifetimeCalculator();
  const [linesPerWeek, setLinesPerWeek] = useState<number>(2);
  const [birthDate, setBirthDate] = useState<string>('');

  const handleCalculate = () => {
    if (!birthDate || linesPerWeek <= 0) return;

    const dateOfBirth = new Date(birthDate);
    const stats = calculateLifetimeStats(linesPerWeek, dateOfBirth);

    // Store results in context
    setCalculation(stats);
    goToScene('report');
  };

  const isFormValid = birthDate && linesPerWeek > 0;

  return (
    <SceneTransition sceneId="lifetime" isActive={currentScene === 'lifetime'}>
      <GlassPanel size="md">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Your Lifetime of Play</h2>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleCalculate();
          }}
        >
          <div>
            <label htmlFor="lines" className="block text-sm font-medium text-gray-300 mb-2">
              Lines per draw (Tues & Fri)
            </label>
            <input
              type="number"
              id="lines"
              min="1"
              max="100"
              value={linesPerWeek}
              onChange={(e) => setLinesPerWeek(Number(e.target.value))}
              placeholder="e.g., 2"
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-300 mb-2">
              Your Date of Birth
            </label>
            <input
              type="date"
              id="dob"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full font-bold py-3 px-4 rounded-lg shadow-lg transition-all ${
              isFormValid
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Calculate The Final Report
          </button>
        </form>
      </GlassPanel>
    </SceneTransition>
  );
};
