import React, { useEffect, useRef } from 'react';

export const LiquidSpotlight: React.FC = () => {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ currentX: 0, currentY: 0, targetX: 0, targetY: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Center spotlight initially
    const initX = window.innerWidth / 2;
    const initY = window.innerHeight / 3;
    posRef.current = { currentX: initX, currentY: initY, targetX: initX, targetY: initY };

    const handleMouseMove = (e: MouseEvent) => {
      posRef.current.targetX = e.clientX;
      posRef.current.targetY = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        posRef.current.targetX = e.touches[0].clientX;
        posRef.current.targetY = e.touches[0].clientY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Smooth spring/lerp loop for 60fps tracking
    const updatePosition = () => {
      const { currentX, currentY, targetX, targetY } = posRef.current;
      const ease = 0.08;
      const nextX = currentX + (targetX - currentX) * ease;
      const nextY = currentY + (targetY - currentY) * ease;

      posRef.current.currentX = nextX;
      posRef.current.currentY = nextY;

      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(updatePosition);
    };

    rafRef.current = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Dynamic Cursor Spotlight Mesh */}
      <div
        ref={spotlightRef}
        className="absolute -top-[350px] -left-[350px] w-[700px] h-[700px] rounded-full opacity-40 mix-blend-screen pointer-events-none transition-opacity duration-500 will-change-transform"
        style={{
          background: 'radial-gradient(circle at center, rgba(10, 132, 255, 0.18) 0%, rgba(94, 92, 230, 0.08) 35%, rgba(191, 90, 242, 0.03) 55%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />
    </div>
  );
};

export default LiquidSpotlight;
