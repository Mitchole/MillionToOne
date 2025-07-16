import React, { useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useAppContext } from '../../context/AppContext';
import { generateBackgroundStars } from '../../utils/starfield';
import { Star } from '../../types';
import gsap from 'gsap';

export const BackgroundCanvas: React.FC = () => {
  const { canvasRef, context, size } = useCanvas();
  const { state } = useAppContext();
  const starsRef = useRef<Star[]>([]);

  useEffect(() => {
    if (!size.width || !size.height) return;

    // Generate background stars
    starsRef.current = generateBackgroundStars(size.width, size.height, 200);

    // Animate star alpha values for twinkling effect
    gsap.to(starsRef.current, {
      alpha: () => 0.1 + Math.random() * 0.3,
      duration: () => 1 + Math.random() * 3,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      stagger: { amount: 2, from: 'random' },
    });
  }, [size.width, size.height]);

  useEffect(() => {
    if (!context || !size.width || !size.height) return;

    const draw = () => {
      context.clearRect(0, 0, size.width, size.height);

      // Apply parallax effect if ambient animation is active
      const parallaxFactor = state.animation.ambientPanTween ? 0.02 : 0;
      const offsetX = (state.camera.x * parallaxFactor) % size.width;
      const offsetY = (state.camera.y * parallaxFactor) % size.height;

      context.save();
      context.translate(-offsetX, -offsetY);

      // Draw stars in a 3x3 grid for seamless tiling
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const tileX = i * size.width;
          const tileY = j * size.height;

          starsRef.current.forEach((star) => {
            const alpha = star.alpha ?? 0.5;
            context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            context.beginPath();
            context.arc(star.x + tileX, star.y + tileY, star.size, 0, Math.PI * 2);
            context.fill();
          });
        }
      }

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
  }, [context, size, state.camera.x, state.camera.y, state.animation.ambientPanTween]);

  return (
    <canvas
      ref={canvasRef}
      className="canvas-layer background-canvas"
      style={{ width: '100%', height: '100%' }}
    />
  );
};
