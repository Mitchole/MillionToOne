import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNumberPicker } from '../../hooks/useNumberPicker';
import { useAppContext } from '../../context/AppContext';

// Mock the AppContext
vi.mock('../../context/AppContext', () => ({
  useAppContext: vi.fn(),
}));

describe('useNumberPicker', () => {
  const mockDispatch = vi.fn();
  const mockState = {
    lotteryNumbers: { main: [], lucky: [] },
    targetDot: null,
    winnerDot: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppContext as any).mockReturnValue({
      state: mockState,
      dispatch: mockDispatch,
    });
  });

  describe('initial state', () => {
    it('should have empty selections initially', () => {
      const { result } = renderHook(() => useNumberPicker());

      expect(result.current.selectedMain).toEqual([]);
      expect(result.current.selectedLucky).toEqual([]);
      expect(result.current.isSelectionComplete()).toBe(false);
    });
  });

  describe('toggleMainNumber', () => {
    it('should add number when not selected', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        result.current.toggleMainNumber(5);
      });

      expect(result.current.selectedMain).toContain(5);
    });

    it('should remove number when already selected', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        result.current.toggleMainNumber(5);
        result.current.toggleMainNumber(5);
      });

      expect(result.current.selectedMain).not.toContain(5);
    });

    it('should not add more than 5 main numbers', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        result.current.toggleMainNumber(1);
        result.current.toggleMainNumber(2);
        result.current.toggleMainNumber(3);
        result.current.toggleMainNumber(4);
        result.current.toggleMainNumber(5);
        result.current.toggleMainNumber(6);
      });

      expect(result.current.selectedMain).toHaveLength(5);
      expect(result.current.selectedMain).not.toContain(6);
    });

    it('should keep numbers sorted', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        result.current.toggleMainNumber(10);
        result.current.toggleMainNumber(5);
        result.current.toggleMainNumber(15);
      });

      expect(result.current.selectedMain).toEqual([5, 10, 15]);
    });
  });

  describe('toggleLuckyStar', () => {
    it('should add lucky star when not selected', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        result.current.toggleLuckyStar(3);
      });

      expect(result.current.selectedLucky).toContain(3);
    });

    it('should remove lucky star when already selected', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        result.current.toggleLuckyStar(3);
        result.current.toggleLuckyStar(3);
      });

      expect(result.current.selectedLucky).not.toContain(3);
    });

    it('should not add more than 2 lucky stars', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        result.current.toggleLuckyStar(1);
        result.current.toggleLuckyStar(2);
        result.current.toggleLuckyStar(3);
      });

      expect(result.current.selectedLucky).toHaveLength(2);
      expect(result.current.selectedLucky).not.toContain(3);
    });
  });

  describe('selection state helpers', () => {
    it('should detect when selection is complete', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        [1, 2, 3, 4, 5].forEach((n) => result.current.toggleMainNumber(n));
        [1, 2].forEach((n) => result.current.toggleLuckyStar(n));
      });

      expect(result.current.isSelectionComplete()).toBe(true);
    });

    it('should detect when numbers are disabled', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        [1, 2, 3, 4, 5].forEach((n) => result.current.toggleMainNumber(n));
      });

      expect(result.current.isMainDisabled(6)).toBe(true);
      expect(result.current.isMainDisabled(1)).toBe(false); // Already selected
    });

    it('should provide correct selection status', () => {
      const { result } = renderHook(() => useNumberPicker());

      expect(result.current.getSelectionStatus()).toBe('Select 5 more main & 2 more lucky stars');

      act(() => {
        [1, 2, 3].forEach((n) => result.current.toggleMainNumber(n));
      });

      expect(result.current.getSelectionStatus()).toBe('Select 2 more main & 2 more lucky stars');
    });
  });

  describe('confirmSelection', () => {
    it('should confirm when selection is complete and valid', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        [1, 2, 3, 4, 5].forEach((n) => result.current.toggleMainNumber(n));
        [1, 2].forEach((n) => result.current.toggleLuckyStar(n));
      });

      const success = result.current.confirmSelection();

      expect(success).toBe(true);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_LOTTERY_NUMBERS',
        payload: { main: [1, 2, 3, 4, 5], lucky: [1, 2] },
      });
    });

    it('should not confirm when selection is incomplete', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        [1, 2, 3].forEach((n) => result.current.toggleMainNumber(n));
      });

      const success = result.current.confirmSelection();

      expect(success).toBe(false);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('resetSelection', () => {
    it('should reset all selections', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        [1, 2, 3].forEach((n) => result.current.toggleMainNumber(n));
        [1].forEach((n) => result.current.toggleLuckyStar(n));
        result.current.resetSelection();
      });

      expect(result.current.selectedMain).toEqual([]);
      expect(result.current.selectedLucky).toEqual([]);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_LOTTERY_NUMBERS',
        payload: { main: [], lucky: [] },
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'RESET_DOTS',
      });
    });
  });

  describe('getDisplayNumbers', () => {
    it('should return display format with placeholders', () => {
      const { result } = renderHook(() => useNumberPicker());

      act(() => {
        [1, 2, 3].forEach((n) => result.current.toggleMainNumber(n));
        [1].forEach((n) => result.current.toggleLuckyStar(n));
      });

      const display = result.current.getDisplayNumbers();

      expect(display.main).toEqual([1, 2, 3, '?', '?']);
      expect(display.lucky).toEqual([1, '?']);
    });
  });
});
