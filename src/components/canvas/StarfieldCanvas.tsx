import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useAppContext } from '../../context/AppContext';
import { getOptimalLOD, BASE_LOD_LEVELS, getStarsForCell } from '../../utils/starfield';
import { LODLevel, LODTransition } from '../../types/canvas';
import gsap from 'gsap';

export const StarfieldCanvas: React.FC = () => {
  const { canvasRef, context, size } = useCanvas();
  const { state } = useAppContext();
  const primaryLODRef = useRef<LODLevel>(BASE_LOD_LEVELS[0]);
  const lodTransitionRef = useRef<LODTransition>({
    from: null,
    to: null,
    progress: 0,
    tween: null,
  });

  const drawLOD = (lod: LODLevel, opacity: number, scale: number = 1) => {
    if (!context || !lod || opacity <= 0) return;

    context.globalAlpha = opacity;

    const viewLeft = state.camera.x - size.width / 2 / state.camera.zoom;
    const viewRight = state.camera.x + size.width / 2 / state.camera.zoom;
    const viewTop = state.camera.y - size.height / 2 / state.camera.zoom;
    const viewBottom = state.camera.y + size.height / 2 / state.camera.zoom;

    let startCellX = Math.floor(viewLeft / lod.cellSize);
    let endCellX = Math.floor(viewRight / lod.cellSize);
    let startCellY = Math.floor(viewTop / lod.cellSize);
    let endCellY = Math.floor(viewBottom / lod.cellSize);

    // Limit rendered cells for performance
    const MAX_CELLS_RENDERED = 900;
    if ((endCellX - startCellX) * (endCellY - startCellY) > MAX_CELLS_RENDERED) {
      const cellsPerAxis = Math.sqrt(MAX_CELLS_RENDERED);
      const centerCellX = Math.round(state.camera.x / lod.cellSize);
      const centerCellY = Math.round(state.camera.y / lod.cellSize);

      startCellX = centerCellX - Math.floor(cellsPerAxis / 2);
      endCellX = centerCellX + Math.ceil(cellsPerAxis / 2);
      startCellY = centerCellY - Math.floor(cellsPerAxis / 2);
      endCellY = centerCellY + Math.ceil(cellsPerAxis / 2);
    }

    // Simplified approach: use the original synchronous star generation
    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        const cellStars = getStarsForCell(cx, cy, lod);

        cellStars.forEach((star) => {
          context.fillStyle = star.color;
          context.beginPath();
          context.arc(star.x, star.y, star.size * scale, 0, Math.PI * 2);
          context.fill();
        });
      }
    }
  };

  const drawDots = () => {
    if (!context) return;

    context.globalAlpha = 1;

    const dots = [state.targetDot, state.winnerDot].filter(Boolean);

    dots.forEach((dot) => {
      if (!dot || dot.size <= 0) return;

      const size = Math.max(dot.size, 3 / state.camera.zoom);
      context.fillStyle = dot.color;
      context.shadowColor = dot.color;
      context.shadowBlur = 15;
      context.beginPath();
      context.arc(dot.x, dot.y, size, 0, Math.PI * 2);
      context.fill();
    });
  };

  useEffect(() => {
    if (!context || !size.width || !size.height) return;

    const draw = () => {
      context.clearRect(0, 0, size.width, size.height);
      context.save();

      // Apply camera transformation
      context.translate(size.width / 2, size.height / 2);
      context.scale(state.camera.zoom, state.camera.zoom);
      context.translate(-state.camera.x, -state.camera.y);

      // Determine optimal LOD level
      const targetLOD = getOptimalLOD(state.camera.zoom);
      const lodTransition = lodTransitionRef.current;

      if (targetLOD.level !== primaryLODRef.current.level) {
        if (!lodTransition.tween || lodTransition.to?.level !== targetLOD.level) {
          if (lodTransition.tween) {
            lodTransition.tween.kill();
          }

          lodTransition.from = primaryLODRef.current;
          lodTransition.to = targetLOD;
          lodTransition.progress = 0;

          lodTransition.tween = gsap.to(lodTransition, {
            progress: 1,
            duration: 1.5,
            ease: 'sine.inOut',
            onComplete: () => {
              lodTransition.from = null;
              lodTransition.tween = null;
            },
          });
        }
        primaryLODRef.current = targetLOD;
      }

      // Set up star glow effect
      context.shadowColor = 'rgba(255, 255, 255, 0.5)';
      context.shadowBlur = 5;

      // Draw LOD layers
      if (lodTransition.tween) {
        if (lodTransition.from) {
          drawLOD(lodTransition.from, 1 - lodTransition.progress);
        }
        if (lodTransition.to) {
          drawLOD(lodTransition.to, lodTransition.progress, lodTransition.progress);
        }
      } else {
        drawLOD(primaryLODRef.current, 1);
      }

      // Draw special dots
      drawDots();

      context.restore();
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
    state.targetDot,
    state.winnerDot,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="canvas-layer zoom-canvas"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
