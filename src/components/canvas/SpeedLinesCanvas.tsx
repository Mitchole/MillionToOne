import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useAppContext } from '../../context/AppContext';
import { isReducedMotionPreferred } from '../../utils/animation';

interface SpeedLine {
  x: number;
  y: number;
  length: number;
  angle: number;
  opacity: number;
  speed: number;
}

interface SpeedLinesCanvasProps {
  enabled?: boolean;
  lineCount?: number;
  minSpeed?: number;
}

export const SpeedLinesCanvas: React.FC<SpeedLinesCanvasProps> = ({
  enabled = true,
  lineCount = 50,
  minSpeed = 0.5,
}) => {
  const { canvasRef, context, size } = useCanvas();
  const { state } = useAppContext();
  const lastCameraRef = useRef(state.camera);
  const speedLinesRef = useRef<SpeedLine[]>([]);

  // Don't render speed lines if reduced motion is preferred
  const shouldRender = enabled && !isReducedMotionPreferred();

  useEffect(() => {
    if (!context || !size.width || !size.height || !shouldRender) return;

    const draw = () => {
      if (!context) return;

      // Calculate camera velocity
      const currentCamera = state.camera;
      const lastCamera = lastCameraRef.current;

      const deltaX = currentCamera.x - lastCamera.x;
      const deltaY = currentCamera.y - lastCamera.y;
      const deltaZoom = currentCamera.zoom - lastCamera.zoom;

      const panVelocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const zoomVelocity = Math.abs(deltaZoom);
      const totalVelocity = panVelocity + zoomVelocity * 0.1;

      // Clear canvas
      context.clearRect(0, 0, size.width, size.height);

      // Only draw speed lines if there's significant movement
      if (totalVelocity > minSpeed) {
        updateSpeedLines(totalVelocity, deltaX, deltaY, deltaZoom);
        drawSpeedLines(context, totalVelocity);
      } else {
        // Fade out existing lines
        speedLinesRef.current = speedLinesRef.current.filter((line) => {
          line.opacity *= 0.9;
          return line.opacity > 0.01;
        });

        if (speedLinesRef.current.length > 0) {
          drawSpeedLines(context, 0);
        }
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
  }, [
    context,
    size,
    state.camera.x,
    state.camera.y,
    state.camera.zoom,
    shouldRender,
    lineCount,
    minSpeed,
  ]);

  const updateSpeedLines = (
    velocity: number,
    deltaX: number,
    deltaY: number,
    deltaZoom: number,
  ) => {
    const centerX = size.width / 2;
    const centerY = size.height / 2;

    // Remove old lines
    speedLinesRef.current = speedLinesRef.current.filter((line) => line.opacity > 0.01);

    // Add new lines based on velocity
    const linesToAdd = Math.floor(velocity * 10);

    for (let i = 0; i < Math.min(linesToAdd, lineCount - speedLinesRef.current.length); i++) {
      let newLine: SpeedLine;

      if (Math.abs(deltaZoom) > 0.1) {
        // Zoom-based radial lines
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * Math.min(size.width, size.height) * 0.3;
        const zoomDirection = deltaZoom > 0 ? 1 : -1;

        newLine = {
          x: centerX + Math.cos(angle) * distance * zoomDirection,
          y: centerY + Math.sin(angle) * distance * zoomDirection,
          length: Math.random() * 30 + 20,
          angle: angle + (zoomDirection > 0 ? Math.PI : 0),
          opacity: Math.min(velocity * 0.5, 0.8),
          speed: velocity * 2,
        };
      } else {
        // Pan-based directional lines
        const panAngle = Math.atan2(deltaY, deltaX) + Math.PI;
        const angleVariation = (Math.random() - 0.5) * 0.5;
        const distance = Math.random() * Math.min(size.width, size.height) * 0.4;

        newLine = {
          x: centerX + Math.cos(panAngle + angleVariation) * distance,
          y: centerY + Math.sin(panAngle + angleVariation) * distance,
          length: Math.random() * 40 + 30,
          angle: panAngle + angleVariation,
          opacity: Math.min(velocity * 0.3, 0.6),
          speed: velocity * 1.5,
        };
      }

      speedLinesRef.current.push(newLine);
    }

    // Update existing lines
    speedLinesRef.current.forEach((line) => {
      // Move lines based on their speed and angle
      line.x += Math.cos(line.angle) * line.speed;
      line.y += Math.sin(line.angle) * line.speed;

      // Fade out lines over time
      line.opacity *= 0.95;

      // Remove lines that are off-screen
      if (line.x < -50 || line.x > size.width + 50 || line.y < -50 || line.y > size.height + 50) {
        line.opacity = 0;
      }
    });
  };

  const drawSpeedLines = (ctx: CanvasRenderingContext2D, velocity: number) => {
    speedLinesRef.current.forEach((line) => {
      if (line.opacity <= 0) return;

      ctx.globalAlpha = line.opacity;
      ctx.strokeStyle = `rgba(255, 255, 255, ${line.opacity})`;
      ctx.lineWidth = Math.max(1, velocity * 0.5);

      // Create line with gradient
      const gradient = ctx.createLinearGradient(
        line.x,
        line.y,
        line.x + Math.cos(line.angle) * line.length,
        line.y + Math.sin(line.angle) * line.length,
      );

      gradient.addColorStop(0, `rgba(255, 255, 255, ${line.opacity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${line.opacity * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.strokeStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(
        line.x + Math.cos(line.angle) * line.length,
        line.y + Math.sin(line.angle) * line.length,
      );
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="canvas-layer speed-lines-canvas"
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 11,
      }}
    />
  );
};
