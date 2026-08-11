import React, { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hoverEffect?: boolean;
  glowColor?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  delay = 0,
  hoverEffect = true,
  glowColor = 'rgba(59, 130, 246, 0.15)',
  onClick,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !hoverEffect) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0.2 }
          : {
              type: 'spring',
              stiffness: 350,
              damping: 25,
              delay: delay,
            }
      }
      whileHover={
        hoverEffect && !shouldReduceMotion
          ? {
              scale: 1.02,
              y: -2,
              transition: { type: 'spring', stiffness: 400, damping: 25 },
            }
          : undefined
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-[2rem] bg-white/[0.04] border border-white/10 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 group',
        onClick ? 'cursor-pointer select-none' : '',
        className
      )}
      style={{
        boxShadow: isHovered
          ? `0 20px 40px -15px ${glowColor}, 0 0 30px 0 ${glowColor}`
          : '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      }}
      {...(props as any)}
    >
      {/* Interactive Glass Reflection Effect Following Mouse */}
      {hoverEffect && isHovered && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.12), transparent 80%)`,
          }}
        />
      )}

      {/* Subtle Ambient Border Light */}
      <div className="pointer-events-none absolute -inset-px rounded-[2rem] border border-white/0 group-hover:border-white/20 transition-colors duration-300" />

      <div className="relative z-20">{children}</div>
    </motion.div>
  );
};

export default GlassCard;
