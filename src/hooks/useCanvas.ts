import { useRef, useEffect, useState } from 'react';
import { CanvasSize } from '../types';

export const useCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    console.log('Canvas context:', ctx);
    setContext(ctx);

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      console.log('Canvas rect:', rect);

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      setSize({ width: rect.width, height: rect.height });
      console.log('Canvas size set to:', { width: rect.width, height: rect.height });
    };

    // Add a small delay to ensure the canvas is mounted
    setTimeout(() => {
      updateSize();
    }, 100);

    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const clearCanvas = () => {
    if (context && size.width && size.height) {
      context.clearRect(0, 0, size.width, size.height);
    }
  };

  return {
    canvasRef,
    context,
    size,
    clearCanvas,
  };
};
