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
  floating?: boolean;
  elevated?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  delay = 0,
  hoverEffect = true,
  tiltEffect = true,
  glowColor = 'rgba(10, 132, 255, 0.25)',
  floating = false,
  elevated = false,
  onClick,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !tiltEffect || shouldReduceMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, filter: 'blur(6px)' }}
      animate={{ 
        opacity: 1, 
        y: 0,
        filter: 'blur(0px)',
      }}
      transition={
        shouldReduceMotion
          ? { duration: 0.2 }
          : {
              duration: 0.45,
              ease: [0.16, 1, 0.3, 1],
              delay: delay,
            }
      }
      whileHover={
        hoverEffect && !shouldReduceMotion
          ? {
              y: -3,
              scale: 1.004,
              transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            }
          : undefined
      }
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-[24px] transition-all duration-300 ease-out group select-none',
        (!className || !/\bp[xytblrs]?-\d+/.test(className)) && 'p-6',
        elevated ? 'vision-glass-elevated' : 'vision-glass',
        floating && !shouldReduceMotion ? 'animate-float' : '',
        onClick ? 'cursor-pointer' : '',
        className
      )}
      style={{
        boxShadow: isHovered
          ? `0 20px 48px -8px rgba(0,0,0,0.75), 0 0 28px -4px ${glowColor}, inset 0 1px 1px 0 rgba(255,255,255,0.35)`
          : undefined,
      }}
      {...(props as any)}
    >
      {/* Top Specular Rim Reflection Highlight */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Left Specular Glaze */}
      <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-40 group-hover:opacity-80 transition-opacity duration-300" />

      {/* Interactive Cursor Light Spot inside the Glass */}
      {isHovered && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 opacity-100 rounded-[24px]"
          style={{
            background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.085), transparent 45%)`,
          }}
        />
      )}

      {/* Subtle Optical Lens Flare Sheen */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export default GlassCard;
