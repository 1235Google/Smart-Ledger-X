import React, { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hoverEffect?: boolean;
  tiltEffect?: boolean;
  glowColor?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  delay = 0,
  hoverEffect = true,
  tiltEffect = true,
  glowColor = 'rgba(59, 130, 246, 0.15)',
  onClick,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !hoverEffect) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (tiltEffect && !shouldReduceMotion) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rx = ((y - centerY) / centerY) * -4; // max 4 deg
      const ry = ((x - centerX) / centerX) * 4;  // max 4 deg
      setTilt({ rx, ry });
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        rotateX: isHovered && tiltEffect ? tilt.rx : 0,
        rotateY: isHovered && tiltEffect ? tilt.ry : 0,
      }}
      transition={
        shouldReduceMotion
          ? { duration: 0.2 }
          : {
              type: 'spring',
              stiffness: 380,
              damping: 26,
              delay: delay,
            }
      }
      whileHover={
        hoverEffect && !shouldReduceMotion
          ? {
              scale: 1.015,
              y: -3,
              transition: { type: 'spring', stiffness: 400, damping: 25 },
            }
          : undefined
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-[2rem] bg-white/[0.04] border border-white/10 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 group perspective-1000',
        onClick ? 'cursor-pointer select-none' : '',
        className
      )}
      style={{
        boxShadow: isHovered
          ? `0 24px 48px -12px ${glowColor}, 0 0 32px 0 ${glowColor}`
          : '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      }}
      {...(props as any)}
    >
      {/* Dynamic Specular Reflection Effect Following Mouse */}
      {hoverEffect && isHovered && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(420px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.12), transparent 75%)`,
          }}
        />
      )}

      {/* Subtle Ambient Border Light with Gradient Transition */}
      <div className="pointer-events-none absolute -inset-px rounded-[2rem] border border-white/0 group-hover:border-white/20 transition-colors duration-300" />

      {/* Top Rim Shimmer Line */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-20">{children}</div>
    </motion.div>
  );
};

export default GlassCard;
