import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassPanel } from '../../components/ui/GlassPanel';

describe('GlassPanel', () => {
  it('should render children', () => {
    render(
      <GlassPanel>
        <div>Test content</div>
      </GlassPanel>,
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should apply glass-panel class', () => {
    render(
      <GlassPanel>
        <div>Test content</div>
      </GlassPanel>,
    );

    const panel = screen.getByText('Test content').parentElement;
    expect(panel).toHaveClass('glass-panel');
  });

  it('should apply default size (md)', () => {
    render(
      <GlassPanel>
        <div>Test content</div>
      </GlassPanel>,
    );

    const panel = screen.getByText('Test content').parentElement;
    expect(panel).toHaveClass('max-w-md');
  });

  it('should apply custom size', () => {
    render(
      <GlassPanel size="lg">
        <div>Test content</div>
      </GlassPanel>,
    );

    const panel = screen.getByText('Test content').parentElement;
    expect(panel).toHaveClass('max-w-lg');
  });

  it('should apply default padding (md)', () => {
    render(
      <GlassPanel>
        <div>Test content</div>
      </GlassPanel>,
    );

    const panel = screen.getByText('Test content').parentElement;
    expect(panel).toHaveClass('p-6');
  });

  it('should apply custom padding', () => {
    render(
      <GlassPanel padding="lg">
        <div>Test content</div>
      </GlassPanel>,
    );

    const panel = screen.getByText('Test content').parentElement;
    expect(panel).toHaveClass('p-8');
  });

  it('should apply custom className', () => {
    render(
      <GlassPanel className="custom-class">
        <div>Test content</div>
      </GlassPanel>,
    );

    const panel = screen.getByText('Test content').parentElement;
    expect(panel).toHaveClass('custom-class');
  });

  it('should combine all classes correctly', () => {
    render(
      <GlassPanel size="xl" padding="sm" className="custom-class">
        <div>Test content</div>
      </GlassPanel>,
    );

    const panel = screen.getByText('Test content').parentElement;
    expect(panel).toHaveClass('glass-panel');
    expect(panel).toHaveClass('max-w-xl');
    expect(panel).toHaveClass('p-4');
    expect(panel).toHaveClass('custom-class');
    expect(panel).toHaveClass('w-full');
  });
});
