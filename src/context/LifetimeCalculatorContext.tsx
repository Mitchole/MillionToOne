import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LifetimeCalculation } from '../types';

interface LifetimeCalculatorContextType {
  calculation: LifetimeCalculation | null;
  setCalculation: (calculation: LifetimeCalculation) => void;
  clearCalculation: () => void;
}

const LifetimeCalculatorContext = createContext<LifetimeCalculatorContextType | undefined>(
  undefined,
);

export const LifetimeCalculatorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [calculation, setCalculationState] = useState<LifetimeCalculation | null>(null);

  const setCalculation = (calculation: LifetimeCalculation) => {
    setCalculationState(calculation);
  };

  const clearCalculation = () => {
    setCalculationState(null);
  };

  return (
    <LifetimeCalculatorContext.Provider value={{ calculation, setCalculation, clearCalculation }}>
      {children}
    </LifetimeCalculatorContext.Provider>
  );
};

export const useLifetimeCalculator = (): LifetimeCalculatorContextType => {
  const context = useContext(LifetimeCalculatorContext);
  if (!context) {
    throw new Error('useLifetimeCalculator must be used within a LifetimeCalculatorProvider');
  }
  return context;
};
