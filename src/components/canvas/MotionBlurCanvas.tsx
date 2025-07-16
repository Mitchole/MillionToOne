import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useAppContext } from '../../context/AppContext';
import { isReducedMotionPreferred } from '../../utils/animation';

interface MotionBlurCanvasProps {
  intensity?: number;
  enabled?: boolean;
}

export const MotionBlurCanvas: React.FC<MotionBlurCanvasProps> = ({
  intensity = 0.1,
  enabled = true,
}) => {
  const { canvasRef, context, size } = useCanvas();
  const { state } = useAppContext();
  const lastCameraRef = useRef(state.camera);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailContextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Don't render motion blur if reduced motion is preferred
  const shouldRender = enabled && !isReducedMotionPreferred();

  useEffect(() => {
    if (!context || !size.width || !size.height || !shouldRender) return;

    // Create trail canvas for motion blur effect
    if (!trailCanvasRef.current) {
      trailCanvasRef.current = document.createElement('canvas');
      trailCanvasRef.current.width = size.width;
      trailCanvasRef.current.height = size.height;
      trailContextRef.current = trailCanvasRef.current.getContext('2d');
    }

    // Update trail canvas size if needed
    if (
      trailCanvasRef.current.width !== size.width ||
      trailCanvasRef.current.height !== size.height
    ) {
      trailCanvasRef.current.width = size.width;
      trailCanvasRef.current.height = size.height;
    }

    const trailContext = trailContextRef.current;
    if (!trailContext) return;

    const draw = () => {
      if (!context || !trailContext) return;

      // Calculate camera velocity
      const currentCamera = state.camera;
      const lastCamera = lastCameraRef.current;

      const deltaX = currentCamera.x - lastCamera.x;
      const deltaY = currentCamera.y - lastCamera.y;
      const deltaZoom = currentCamera.zoom - lastCamera.zoom;

      const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) + Math.abs(deltaZoom) * 0.1;

      // Only apply motion blur if there's significant movement
      if (velocity > 0.1) {
        // Calculate blur intensity based on velocity
        const blurIntensity = Math.min(velocity * intensity, 0.8);

        // Clear the main canvas
        context.clearRect(0, 0, size.width, size.height);

        // Draw previous frame with reduced opacity (creates trail effect)
        if (trailCanvasRef.current && trailCanvasRef.current.width > 0) {
          context.globalAlpha = 1 - blurIntensity;
          context.drawImage(trailCanvasRef.current, 0, 0);
        }

        // Draw motion blur streaks
        if (blurIntensity > 0.2) {
          drawMotionStreaks(context, currentCamera, deltaX, deltaY, deltaZoom, blurIntensity);
        }

        // Store current frame for next iteration
        context.globalAlpha = 1;
        trailContext.clearRect(0, 0, size.width, size.height);
        trailContext.drawImage(context.canvas, 0, 0);
      }

      lastCameraRef.current = { ...currentCamera };
    };

    draw();

    // Set up animation frame loop
    let animationId: number;
    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [context, size, state.camera.x, state.camera.y, state.camera.zoom, intensity, shouldRender]);

  const drawMotionStreaks = (
    ctx: CanvasRenderingContext2D,
    camera: typeof state.camera,
    deltaX: number,
    deltaY: number,
    deltaZoom: number,
    intensity: number,
  ) => {
    const centerX = size.width / 2;
    const centerY = size.height / 2;

    // Create gradient for motion streaks
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      Math.max(size.width, size.height) / 2,
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.3})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.1})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;

    // Draw directional streaks based on movement
    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
      // Panning motion streaks
      const angle = Math.atan2(deltaY, deltaX);
      const streakLength = Math.min(intensity * 100, 50);

      for (let i = 0; i < 20; i++) {
        const x = centerX + Math.cos(angle + (Math.random() - 0.5) * 0.2) * (i * 5);
        const y = centerY + Math.sin(angle + (Math.random() - 0.5) * 0.2) * (i * 5);

        ctx.globalAlpha = intensity * (1 - i / 20);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, streakLength / (i + 1)), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Zoom motion streaks (radial)
    if (Math.abs(deltaZoom) > 0.1) {
      const zoomIntensity = Math.min(Math.abs(deltaZoom) * 0.1, 0.5);

      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const distance = zoomIntensity * 200;

        ctx.globalAlpha = zoomIntensity;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance);
        ctx.strokeStyle = `rgba(255, 255, 255, ${zoomIntensity * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="canvas-layer motion-blur-canvas"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
};
