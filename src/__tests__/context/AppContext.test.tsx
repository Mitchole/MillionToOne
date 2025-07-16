import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../../context/AppContext';
import { ReactNode } from 'react';

// Test component to access context
const TestComponent = () => {
  const { state, dispatch } = useAppContext();

  return (
    <div>
      <div data-testid="scene">{state.currentScene}</div>
      <div data-testid="camera-x">{state.camera.x}</div>
      <div data-testid="camera-y">{state.camera.y}</div>
      <div data-testid="camera-zoom">{state.camera.zoom}</div>
      <div data-testid="main-numbers">{state.lotteryNumbers.main.join(',')}</div>
      <div data-testid="lucky-numbers">{state.lotteryNumbers.lucky.join(',')}</div>
      <button
        onClick={() => dispatch({ type: 'SET_SCENE', payload: { scene: 'ticket' } })}
        data-testid="set-scene"
      >
        Set Scene
      </button>
      <button
        onClick={() => dispatch({ type: 'SET_CAMERA', payload: { x: 100, y: 200, zoom: 2 } })}
        data-testid="set-camera"
      >
        Set Camera
      </button>
      <button
        onClick={() =>
          dispatch({
            type: 'SET_LOTTERY_NUMBERS',
            payload: { main: [1, 2, 3, 4, 5], lucky: [1, 2] },
          })
        }
        data-testid="set-numbers"
      >
        Set Numbers
      </button>
    </div>
  );
};

const renderWithProvider = (children: ReactNode) => {
  return render(<AppProvider>{children}</AppProvider>);
};

describe('AppContext', () => {
  it('should provide initial state', () => {
    renderWithProvider(<TestComponent />);

    expect(screen.getByTestId('scene')).toHaveTextContent('landing');
    expect(screen.getByTestId('camera-x')).toHaveTextContent('0');
    expect(screen.getByTestId('camera-y')).toHaveTextContent('0');
    expect(screen.getByTestId('camera-zoom')).toHaveTextContent('1');
    expect(screen.getByTestId('main-numbers')).toHaveTextContent('');
    expect(screen.getByTestId('lucky-numbers')).toHaveTextContent('');
  });

  it('should handle SET_SCENE action', () => {
    renderWithProvider(<TestComponent />);

    act(() => {
      screen.getByTestId('set-scene').click();
    });

    expect(screen.getByTestId('scene')).toHaveTextContent('ticket');
  });

  it('should handle SET_CAMERA action', () => {
    renderWithProvider(<TestComponent />);

    act(() => {
      screen.getByTestId('set-camera').click();
    });

    expect(screen.getByTestId('camera-x')).toHaveTextContent('100');
    expect(screen.getByTestId('camera-y')).toHaveTextContent('200');
    expect(screen.getByTestId('camera-zoom')).toHaveTextContent('2');
  });

  it('should handle SET_LOTTERY_NUMBERS action', () => {
    renderWithProvider(<TestComponent />);

    act(() => {
      screen.getByTestId('set-numbers').click();
    });

    expect(screen.getByTestId('main-numbers')).toHaveTextContent('1,2,3,4,5');
    expect(screen.getByTestId('lucky-numbers')).toHaveTextContent('1,2');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppContext must be used within an AppProvider');

    console.error = originalError;
  });

  it('should handle partial camera updates', () => {
    const PartialUpdateComponent = () => {
      const { state, dispatch } = useAppContext();

      return (
        <div>
          <div data-testid="camera-x">{state.camera.x}</div>
          <div data-testid="camera-y">{state.camera.y}</div>
          <div data-testid="camera-zoom">{state.camera.zoom}</div>
          <button
            onClick={() => dispatch({ type: 'SET_CAMERA', payload: { x: 50 } })}
            data-testid="set-camera-x"
          >
            Set Camera X
          </button>
        </div>
      );
    };

    renderWithProvider(<PartialUpdateComponent />);

    act(() => {
      screen.getByTestId('set-camera-x').click();
    });

    expect(screen.getByTestId('camera-x')).toHaveTextContent('50');
    expect(screen.getByTestId('camera-y')).toHaveTextContent('0'); // Should remain unchanged
    expect(screen.getByTestId('camera-zoom')).toHaveTextContent('1'); // Should remain unchanged
  });

  it('should handle dot actions', () => {
    const DotComponent = () => {
      const { state, dispatch } = useAppContext();

      return (
        <div>
          <div data-testid="target-dot">{state.targetDot ? 'present' : 'null'}</div>
          <div data-testid="winner-dot">{state.winnerDot ? 'present' : 'null'}</div>
          <button
            onClick={() =>
              dispatch({
                type: 'SET_TARGET_DOT',
                payload: { x: 10, y: 20, size: 1, color: '#facc15' },
              })
            }
            data-testid="set-target"
          >
            Set Target
          </button>
          <button
            onClick={() =>
              dispatch({
                type: 'SET_WINNER_DOT',
                payload: { x: 30, y: 40, size: 1, color: '#60a5fa' },
              })
            }
            data-testid="set-winner"
          >
            Set Winner
          </button>
          <button onClick={() => dispatch({ type: 'RESET_DOTS' })} data-testid="reset-dots">
            Reset Dots
          </button>
        </div>
      );
    };

    renderWithProvider(<DotComponent />);

    // Initially null
    expect(screen.getByTestId('target-dot')).toHaveTextContent('null');
    expect(screen.getByTestId('winner-dot')).toHaveTextContent('null');

    // Set dots
    act(() => {
      screen.getByTestId('set-target').click();
      screen.getByTestId('set-winner').click();
    });

    expect(screen.getByTestId('target-dot')).toHaveTextContent('present');
    expect(screen.getByTestId('winner-dot')).toHaveTextContent('present');
  });
});
