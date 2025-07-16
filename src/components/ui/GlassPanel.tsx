import React from 'react';
import { cn } from '../../utils/cn';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6 md:p-8',
  lg: 'p-8 md:p-12',
};

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  size = 'md',
  padding = 'md',
}) => {
  return (
    <div
      className={cn('glass-panel', sizeClasses[size], paddingClasses[padding], 'w-full', className)}
    >
      {children}
    </div>
  );
};
