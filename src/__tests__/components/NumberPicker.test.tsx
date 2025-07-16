import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberPicker } from '../../components/ui/NumberPicker';
import { useNumberPicker } from '../../hooks/useNumberPicker';

// Mock the useNumberPicker hook
vi.mock('../../hooks/useNumberPicker', () => ({
  useNumberPicker: vi.fn(),
}));

describe('NumberPicker', () => {
  const mockUseNumberPicker = {
    selectedMain: [],
    selectedLucky: [],
    toggleMainNumber: vi.fn(),
    toggleLuckyStar: vi.fn(),
    isMainSelected: vi.fn((_num: number) => false),
    isLuckySelected: vi.fn((_num: number) => false),
    isMainDisabled: vi.fn((_num: number) => false),
    isLuckyDisabled: vi.fn((_num: number) => false),
    isSelectionComplete: vi.fn(() => false),
    getSelectionStatus: vi.fn(() => 'Select 5 more main & 2 more lucky stars'),
    confirmSelection: vi.fn(() => false),
    getDisplayNumbers: vi.fn(() => ({
      main: ['?', '?', '?', '?', '?'],
      lucky: ['?', '?'],
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useNumberPicker as any).mockReturnValue(mockUseNumberPicker);
  });

  it('should render the picker title', () => {
    render(<NumberPicker />);
    expect(screen.getByText('Pick Your Numbers')).toBeInTheDocument();
  });

  it('should render main number grid (1-50)', () => {
    render(<NumberPicker />);

    // Check that we have buttons for numbers 1-50 in the main grid
    const mainGrid =
      screen.getByRole('grid', { name: /main numbers/i }) ||
      document.querySelector('.grid-cols-10');

    expect(mainGrid).toBeInTheDocument();

    // Count buttons in main grid
    const mainButtons = mainGrid?.querySelectorAll('button');
    expect(mainButtons).toHaveLength(50);
  });

  it('should render lucky stars section', () => {
    render(<NumberPicker />);
    expect(screen.getByText('Pick 2 Lucky Stars')).toBeInTheDocument();
  });

  it('should render lucky star grid (1-12)', () => {
    render(<NumberPicker />);

    // Find lucky star grid
    const luckyGrid = document.querySelector('.grid-cols-12');
    expect(luckyGrid).toBeInTheDocument();

    // Count buttons in lucky grid
    const luckyButtons = luckyGrid?.querySelectorAll('button');
    expect(luckyButtons).toHaveLength(12);
  });

  it('should render display numbers', () => {
    render(<NumberPicker />);

    // Should show placeholder displays for main and lucky numbers
    const displays = screen.getAllByText('?');
    expect(displays).toHaveLength(7); // 5 main + 2 lucky
  });

  it('should call toggleMainNumber when main number clicked', () => {
    render(<NumberPicker />);

    const mainGrid = document.querySelector('.grid-cols-10');
    const button = mainGrid?.querySelector('button:nth-child(10)');

    if (button) {
      fireEvent.click(button);
      expect(mockUseNumberPicker.toggleMainNumber).toHaveBeenCalledWith(10);
    }
  });

  it('should call toggleLuckyStar when lucky star clicked', () => {
    render(<NumberPicker />);

    const luckyGrid = document.querySelector('.grid-cols-12');
    const button = luckyGrid?.querySelector('button:nth-child(5)');

    if (button) {
      fireEvent.click(button);
      expect(mockUseNumberPicker.toggleLuckyStar).toHaveBeenCalledWith(5);
    }
  });

  it('should render confirm button with correct state', () => {
    render(<NumberPicker />);

    const confirmButton = screen.getByRole('button', {
      name: 'Select 5 more main & 2 more lucky stars',
    });

    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
  });

  it('should enable confirm button when selection is complete', () => {
    mockUseNumberPicker.isSelectionComplete.mockReturnValue(true);
    mockUseNumberPicker.getSelectionStatus.mockReturnValue('Confirm Selection');

    render(<NumberPicker />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm Selection' });
    expect(confirmButton).not.toBeDisabled();
  });

  it('should show selected numbers in display', () => {
    mockUseNumberPicker.getDisplayNumbers.mockReturnValue({
      main: ['1', '2', '3', '?', '?'],
      lucky: ['5', '?'],
    });

    render(<NumberPicker />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should apply selected styling to selected numbers', () => {
    mockUseNumberPicker.isMainSelected.mockImplementation((num: number) => num === 10);
    mockUseNumberPicker.isLuckySelected.mockImplementation((num: number) => num === 5);

    render(<NumberPicker />);

    const mainGrid = document.querySelector('.grid-cols-10');
    const mainButton = mainGrid?.querySelector('button:nth-child(10)');
    expect(mainButton).toHaveClass('selected');

    const luckyGrid = document.querySelector('.grid-cols-12');
    const luckyButton = luckyGrid?.querySelector('button:nth-child(5)');
    expect(luckyButton).toHaveClass('selected');
  });

  it('should apply disabled styling to disabled numbers', () => {
    mockUseNumberPicker.isMainDisabled.mockImplementation((num: number) => num === 15);
    mockUseNumberPicker.isLuckyDisabled.mockImplementation((num: number) => num === 8);

    render(<NumberPicker />);

    const mainGrid = document.querySelector('.grid-cols-10');
    const mainButton = mainGrid?.querySelector('button:nth-child(15)');
    expect(mainButton).toHaveClass('disabled');
    expect(mainButton).toBeDisabled();
  });
});
