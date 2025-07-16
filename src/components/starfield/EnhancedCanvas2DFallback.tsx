import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useAppContext } from '../../context/AppContext';
import { getOptimalLOD, BASE_LOD_LEVELS, getStarsForCell } from '../../utils/starfield';
import { generateBackgroundStars } from '../../utils/starfield';
import { LODLevel, LODTransition } from '../../types/canvas';
import { Star } from '../../types';
import gsap from 'gsap';

interface EnhancedCanvas2DFallbackProps {
  className?: string;
  deviceCapabilities?: any;
}

export const EnhancedCanvas2DFallback: React.FC<EnhancedCanvas2DFallbackProps> = ({
  className,
  deviceCapabilities,
}) => {
  console.log('EnhancedCanvas2DFallback rendering with deviceCapabilities:', deviceCapabilities);
  const { canvasRef, context, size } = useCanvas();
  const { state } = useAppContext();
  console.log('Canvas context:', context, 'Size:', size);
  const primaryLODRef = useRef<LODLevel>(BASE_LOD_LEVELS[0]);
  const lodTransitionRef = useRef<LODTransition>({
    from: null,
    to: null,
    progress: 0,
    tween: null,
  });
  const backgroundStarsRef = useRef<Star[]>([]);
  const depthLayersRef = useRef<number>(3);

  // Initialize enhanced fallback features
  useEffect(() => {
    if (!size.width || !size.height) return;

    // Generate multiple layers of background stars for depth illusion
    backgroundStarsRef.current = [];
    for (let layer = 0; layer < depthLayersRef.current; layer++) {
      const layerStars = generateBackgroundStars(size.width, size.height, 50);
      layerStars.forEach((star) => {
        backgroundStarsRef.current.push({
          ...star,
          layer: layer,
          parallaxFactor: 0.1 + layer * 0.05, // Different parallax for each layer
          depthAlpha: 0.3 + layer * 0.2, // Different opacity for depth
        });
      });
    }

    // Add twinkling animation
    gsap.to(backgroundStarsRef.current, {
      alpha: () => 0.1 + Math.random() * 0.4,
      duration: () => 2 + Math.random() * 4,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      stagger: { amount: 3, from: 'random' },
    });
  }, [size.width, size.height]);

  // Enhanced star drawing with depth simulation
  const drawLODWithDepth = (lod: LODLevel, opacity: number, scale: number = 1) => {
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

    // Limit rendered cells for performance (reduced for mobile)
    const maxCells = deviceCapabilities?.isLowEnd ? 400 : 900;
    if ((endCellX - startCellX) * (endCellY - startCellY) > maxCells) {
      const cellsPerAxis = Math.sqrt(maxCells);
      const centerCellX = Math.round(state.camera.x / lod.cellSize);
      const centerCellY = Math.round(state.camera.y / lod.cellSize);

      startCellX = centerCellX - Math.floor(cellsPerAxis / 2);
      endCellX = centerCellX + Math.ceil(cellsPerAxis / 2);
      startCellY = centerCellY - Math.floor(cellsPerAxis / 2);
      endCellY = centerCellY + Math.ceil(cellsPerAxis / 2);
    }

    // Draw stars with enhanced depth simulation
    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        const cellStars = getStarsForCell(cx, cy, lod);

        cellStars.forEach((star, index) => {
          // Simulate depth based on star index and position
          const depthFactor = (index % 10) / 10; // 0-1 depth
          const depthSize = star.size * scale * (0.5 + depthFactor * 0.5);
          const depthAlpha = 0.3 + depthFactor * 0.7;

          context.fillStyle = star.color.replace(')', `, ${depthAlpha})`).replace('rgb', 'rgba');

          // Add depth-based glow effect
          if (depthFactor > 0.7) {
            context.shadowColor = star.color;
            context.shadowBlur = depthSize * 2;
          } else {
            context.shadowBlur = 0;
          }

          context.beginPath();
          context.arc(star.x, star.y, depthSize, 0, Math.PI * 2);
          context.fill();
        });
      }
    }

    context.shadowBlur = 0;
  };

  // Draw background stars with parallax layers
  const drawBackgroundLayers = () => {
    if (!context) return;

    backgroundStarsRef.current.forEach((star) => {
      if (!star.layer) return;

      const layer = star.layer || 0;
      const parallaxFactor = star.parallaxFactor || 0.1;
      const depthAlpha = star.depthAlpha || 0.5;

      // Calculate parallax offset
      const offsetX = (state.camera.x * parallaxFactor) % size.width;
      const offsetY = (state.camera.y * parallaxFactor) % size.height;

      // Draw star with tiling for seamless parallax
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const tileX = i * size.width;
          const tileY = j * size.height;

          const alpha = (star.alpha || 0.5) * depthAlpha;
          context.fillStyle = `rgba(255, 255, 255, ${alpha})`;

          // Add slight variation in color for depth
          if (layer === 0) {
            context.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
          } else if (layer === 1) {
            context.fillStyle = `rgba(255, 248, 220, ${alpha * 0.8})`;
          }

          context.beginPath();
          context.arc(
            star.x + tileX - offsetX,
            star.y + tileY - offsetY,
            star.size * (0.5 + layer * 0.3),
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      }
    });
  };

  // Enhanced dot drawing with depth
  const drawDotsWithDepth = () => {
    if (!context) return;

    context.globalAlpha = 1;

    const dots = [state.targetDot, state.winnerDot].filter(Boolean);

    dots.forEach((dot) => {
      if (!dot || dot.size <= 0) return;

      const size = Math.max(dot.size, 3 / state.camera.zoom);

      // Enhanced glow effect
      const glowSize = size * 3;

      // Check if createRadialGradient is available (not in jsdom tests)
      if (context.createRadialGradient) {
        const gradient = context.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, glowSize);
        gradient.addColorStop(0, dot.color);
        gradient.addColorStop(0.3, dot.color + '80');
        gradient.addColorStop(1, dot.color + '00');

        // Draw outer glow
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(dot.x, dot.y, glowSize, 0, Math.PI * 2);
        context.fill();
      } else {
        // Fallback for test environment
        context.fillStyle = dot.color + '40';
        context.beginPath();
        context.arc(dot.x, dot.y, glowSize, 0, Math.PI * 2);
        context.fill();
      }

      // Draw inner core
      context.fillStyle = dot.color;
      context.shadowColor = dot.color;
      context.shadowBlur = size;
      context.beginPath();
      context.arc(dot.x, dot.y, size, 0, Math.PI * 2);
      context.fill();

      // Add sparkle effect
      context.shadowBlur = 0;
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(dot.x, dot.y, size * 0.3, 0, Math.PI * 2);
      context.fill();
    });
  };

  // Main render loop
  useEffect(() => {
    if (!context || !size.width || !size.height) {
      console.log('Canvas not ready - context:', !!context, 'size:', size);
      return;
    }

    console.log('Setting up Canvas2D rendering loop');

    const draw = () => {
      // Clear canvas
      context.clearRect(0, 0, size.width, size.height);
      context.save();

      // Simple test - draw a colored rectangle to verify canvas is working
      context.fillStyle = 'rgba(100, 50, 200, 0.8)';
      context.fillRect(50, 50, 100, 100);

      // Draw some simple stars for testing
      context.fillStyle = 'white';
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * size.width;
        const y = Math.random() * size.height;
        const radius = Math.random() * 2 + 1;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }

      // Draw background parallax layers first
      drawBackgroundLayers();

      // Apply camera transformation for main content
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

      // Draw LOD layers with enhanced depth
      if (lodTransition.tween) {
        if (lodTransition.from) {
          drawLODWithDepth(lodTransition.from, 1 - lodTransition.progress);
        }
        if (lodTransition.to) {
          drawLODWithDepth(lodTransition.to, lodTransition.progress, lodTransition.progress);
        }
      } else {
        drawLODWithDepth(primaryLODRef.current, 1);
      }

      // Draw special dots with enhanced effects
      drawDotsWithDepth();

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
    deviceCapabilities,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className={`canvas-layer enhanced-fallback-canvas ${className || ''}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
      }}
    />
  );
};
