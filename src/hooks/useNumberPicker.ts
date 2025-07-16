import { useState, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { validateNumbers } from '../utils/lottery';

export const useNumberPicker = () => {
  const { state, dispatch } = useAppContext();
  const [selectedMain, setSelectedMain] = useState<number[]>([]);
  const [selectedLucky, setSelectedLucky] = useState<number[]>([]);

  const MAX_MAIN = 5;
  const MAX_LUCKY = 2;

  const toggleMainNumber = useCallback((number: number) => {
    setSelectedMain((prev) => {
      if (prev.includes(number)) {
        return prev.filter((n) => n !== number);
      } else if (prev.length < MAX_MAIN) {
        return [...prev, number].sort((a, b) => a - b);
      }
      return prev;
    });
  }, []);

  const toggleLuckyStar = useCallback((number: number) => {
    setSelectedLucky((prev) => {
      if (prev.includes(number)) {
        return prev.filter((n) => n !== number);
      } else if (prev.length < MAX_LUCKY) {
        return [...prev, number].sort((a, b) => a - b);
      }
      return prev;
    });
  }, []);

  const isMainSelected = useCallback(
    (number: number) => selectedMain.includes(number),
    [selectedMain],
  );

  const isLuckySelected = useCallback(
    (number: number) => selectedLucky.includes(number),
    [selectedLucky],
  );

  const isMainDisabled = useCallback(
    (number: number) => !isMainSelected(number) && selectedMain.length >= MAX_MAIN,
    [isMainSelected, selectedMain.length],
  );

  const isLuckyDisabled = useCallback(
    (number: number) => !isLuckySelected(number) && selectedLucky.length >= MAX_LUCKY,
    [isLuckySelected, selectedLucky.length],
  );

  const isSelectionComplete = useCallback(
    () => selectedMain.length === MAX_MAIN && selectedLucky.length === MAX_LUCKY,
    [selectedMain.length, selectedLucky.length],
  );

  const isSelectionValid = useCallback(
    () => validateNumbers(selectedMain, selectedLucky),
    [selectedMain, selectedLucky],
  );

  const getSelectionStatus = useCallback(() => {
    const mainNeeded = MAX_MAIN - selectedMain.length;
    const luckyNeeded = MAX_LUCKY - selectedLucky.length;

    if (mainNeeded === 0 && luckyNeeded === 0) {
      return 'Confirm Selection';
    }

    const parts = [];
    if (mainNeeded > 0) {
      parts.push(`${mainNeeded} more main`);
    }
    if (luckyNeeded > 0) {
      parts.push(`${luckyNeeded} more lucky stars`);
    }

    return `Select ${parts.join(' & ')}`;
  }, [selectedMain.length, selectedLucky.length]);

  const confirmSelection = useCallback(() => {
    if (isSelectionComplete() && isSelectionValid()) {
      dispatch({
        type: 'SET_LOTTERY_NUMBERS',
        payload: { main: selectedMain, lucky: selectedLucky },
      });
      return true;
    }
    return false;
  }, [dispatch, isSelectionComplete, isSelectionValid, selectedMain, selectedLucky]);

  const resetSelection = useCallback(() => {
    setSelectedMain([]);
    setSelectedLucky([]);
    dispatch({ type: 'SET_LOTTERY_NUMBERS', payload: { main: [], lucky: [] } });
    dispatch({ type: 'RESET_DOTS' });
  }, [dispatch]);

  const getDisplayNumbers = useCallback(() => {
    const mainDisplay = Array.from({ length: MAX_MAIN }, (_, i) => selectedMain[i] || '?');
    const luckyDisplay = Array.from({ length: MAX_LUCKY }, (_, i) => selectedLucky[i] || '?');
    return { main: mainDisplay, lucky: luckyDisplay };
  }, [selectedMain, selectedLucky]);

  return {
    selectedMain,
    selectedLucky,
    toggleMainNumber,
    toggleLuckyStar,
    isMainSelected,
    isLuckySelected,
    isMainDisabled,
    isLuckyDisabled,
    isSelectionComplete,
    isSelectionValid,
    getSelectionStatus,
    confirmSelection,
    resetSelection,
    getDisplayNumbers,
    MAX_MAIN,
    MAX_LUCKY,
  };
};
