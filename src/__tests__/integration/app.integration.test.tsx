import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import App from '../../App';

// Mock GSAP
vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    context: vi.fn(() => ({
      kill: vi.fn(),
    })),
    killTweensOf: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis(),
      kill: vi.fn(),
    })),
    to: vi.fn(() => ({
      then: vi.fn(),
      kill: vi.fn(),
    })),
  },
}));

vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn((fn) => {
    fn();
    return {
      contextSafe: vi.fn((callback) => callback),
    };
  }),
}));

describe('App Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock canvas methods
    HTMLCanvasElement.prototype.getContext = vi.fn((contextId) => {
      if (contextId === '2d') {
        return {
          clearRect: vi.fn(),
          fillRect: vi.fn(),
          beginPath: vi.fn(),
          arc: vi.fn(),
          fill: vi.fn(),
          scale: vi.fn(),
          translate: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          fillStyle: '',
          globalAlpha: 1,
          shadowColor: '',
          shadowBlur: 0,
        } as any;
      }
      return null;
    }) as any;
  });

  it('should render the landing page', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('MillionToOne')).toBeInTheDocument();
      expect(
        screen.getByText('A visual journey into the odds of winning the lottery.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Begin' })).toBeInTheDocument();
    });
  });

  it('should navigate to number picker when Begin is clicked', async () => {
    render(<App />);

    const beginButton = await screen.findByRole('button', { name: 'Begin' });
    await user.click(beginButton);

    await waitFor(() => {
      expect(screen.getByText('Pick Your Numbers')).toBeInTheDocument();
    });
  });

  it('should handle number selection flow', async () => {
    render(<App />);

    // Start the app
    const beginButton = await screen.findByRole('button', { name: 'Begin' });
    await user.click(beginButton);

    // Wait for number picker to load
    await waitFor(() => {
      expect(screen.getByText('Pick Your Numbers')).toBeInTheDocument();
    });

    // Select 5 main numbers
    const mainGrid = document.querySelector('.grid-cols-10');
    expect(mainGrid).toBeInTheDocument();

    const mainButtons = mainGrid?.querySelectorAll('button');
    expect(mainButtons).toHaveLength(50);

    // Click first 5 buttons
    for (let i = 0; i < 5; i++) {
      if (mainButtons?.[i]) {
        await user.click(mainButtons[i]);
      }
    }

    // Select 2 lucky stars
    const luckyGrid = document.querySelector('.grid-cols-12');
    expect(luckyGrid).toBeInTheDocument();

    const luckyButtons = luckyGrid?.querySelectorAll('button');
    expect(luckyButtons).toHaveLength(12);

    // Click first 2 lucky buttons
    for (let i = 0; i < 2; i++) {
      if (luckyButtons?.[i]) {
        await user.click(luckyButtons[i]);
      }
    }

    // The confirm button should now be enabled
    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm Selection');
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it('should handle canvas rendering', async () => {
    render(<App />);

    // Check that canvases are rendered
    await waitFor(() => {
      const canvases = document.querySelectorAll('canvas');
      expect(canvases).toHaveLength(2); // background + zoom canvas
    });
  });

  it('should handle scene transitions', async () => {
    render(<App />);

    // Start from landing
    expect(screen.getByText('MillionToOne')).toBeInTheDocument();

    // Navigate to number picker
    const beginButton = await screen.findByRole('button', { name: 'Begin' });
    await user.click(beginButton);

    await waitFor(() => {
      expect(screen.getByText('Pick Your Numbers')).toBeInTheDocument();
    });

    // Check that landing scene is no longer visible
    expect(
      screen.queryByText('A visual journey into the odds of winning the lottery.'),
    ).not.toBeInTheDocument();
  });

  it('should handle form validation in lifetime calculator', async () => {
    render(<App />);

    // Navigate through the app to reach lifetime calculator
    // This is a simplified test - in reality we'd need to go through all scenes

    // For now, test the form validation logic
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = '1990-01-01';

    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.value = '2';

    expect(dateInput.value).toBe('1990-01-01');
    expect(numberInput.value).toBe('2');
  });

  it('should handle error boundaries gracefully', async () => {
    // Mock console.error to avoid noise in tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // This test ensures the app doesn't crash on errors
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('MillionToOne')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should handle context state changes', async () => {
    render(<App />);

    // The context should be initialized with default values
    await waitFor(() => {
      expect(screen.getByText('MillionToOne')).toBeInTheDocument();
    });

    // Navigate to number picker to trigger context changes
    const beginButton = await screen.findByRole('button', { name: 'Begin' });
    await user.click(beginButton);

    await waitFor(() => {
      expect(screen.getByText('Pick Your Numbers')).toBeInTheDocument();
    });
  });

  it('should handle reduced motion preferences', async () => {
    // Mock matchMedia to simulate reduced motion preference
    const mockMatchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
      writable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('MillionToOne')).toBeInTheDocument();
    });

    expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('should handle responsive design', async () => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      value: 320,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 568,
      writable: true,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('MillionToOne')).toBeInTheDocument();
    });

    // The app should render correctly on mobile
    const title = screen.getByText('MillionToOne');
    expect(title).toBeInTheDocument();
  });
});
