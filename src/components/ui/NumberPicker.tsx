import React from 'react';
import { useNumberPicker } from '../../hooks/useNumberPicker';
import { cn } from '../../utils/cn';

interface NumberBallProps {
  number: number;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  isLucky?: boolean;
}

const NumberBall: React.FC<NumberBallProps> = ({
  number,
  isSelected,
  isDisabled,
  onClick,
  isLucky = false,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'num-ball w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
        isLucky ? 'bg-yellow-400/20 text-yellow-200' : 'bg-white/10 text-white',
        {
          selected: isSelected,
          disabled: isDisabled,
          lucky: isLucky,
        },
      )}
    >
      {number}
    </button>
  );
};

interface NumberDisplayProps {
  numbers: (number | string)[];
  isLucky?: boolean;
}

const NumberDisplay: React.FC<NumberDisplayProps> = ({ numbers, isLucky = false }) => {
  return (
    <div className="flex justify-center gap-4">
      {numbers.map((num, index) => (
        <div
          key={index}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold',
            isLucky ? 'bg-yellow-400/20 text-yellow-200' : 'bg-white/10 text-white',
          )}
        >
          {num}
        </div>
      ))}
    </div>
  );
};

interface NumberPickerProps {
  onConfirm?: () => void;
}

export const NumberPicker: React.FC<NumberPickerProps> = ({ onConfirm }) => {
  const {
    toggleMainNumber,
    toggleLuckyStar,
    isMainSelected,
    isLuckySelected,
    isMainDisabled,
    isLuckyDisabled,
    isSelectionComplete,
    getSelectionStatus,
    confirmSelection,
    getDisplayNumbers,
  } = useNumberPicker();

  const displayNumbers = getDisplayNumbers();

  const handleConfirm = () => {
    if (confirmSelection()) {
      onConfirm?.();
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">Pick Your Numbers</h2>

      {/* Main Numbers Display */}
      <div className="mb-6">
        <NumberDisplay numbers={displayNumbers.main} />
      </div>

      {/* Main Numbers Grid */}
      <div className="grid grid-cols-10 gap-2 mb-6">
        {Array.from({ length: 50 }, (_, i) => {
          const number = i + 1;
          return (
            <NumberBall
              key={number}
              number={number}
              isSelected={isMainSelected(number)}
              isDisabled={isMainDisabled(number)}
              onClick={() => toggleMainNumber(number)}
            />
          );
        })}
      </div>

      {/* Lucky Stars Section */}
      <h3 className="text-lg font-semibold text-yellow-300 mb-2 text-center">Pick 2 Lucky Stars</h3>

      {/* Lucky Stars Display */}
      <div className="mb-6">
        <NumberDisplay numbers={displayNumbers.lucky} isLucky />
      </div>

      {/* Lucky Stars Grid */}
      <div className="grid grid-cols-12 gap-2 mb-8">
        {Array.from({ length: 12 }, (_, i) => {
          const number = i + 1;
          return (
            <NumberBall
              key={number}
              number={number}
              isSelected={isLuckySelected(number)}
              isDisabled={isLuckyDisabled(number)}
              onClick={() => toggleLuckyStar(number)}
              isLucky
            />
          );
        })}
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={!isSelectionComplete()}
        className={cn(
          'w-full font-bold py-3 px-4 rounded-lg shadow-lg transition-all',
          isSelectionComplete()
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed',
        )}
      >
        {getSelectionStatus()}
      </button>
    </div>
  );
};
