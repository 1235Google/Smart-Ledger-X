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
  glowColor = 'rgba(59, 130, 246, 0.25)',
  onClick,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, filter: 'blur(10px)', scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        filter: 'blur(0px)',
        scale: 1,
      }}
      transition={
        shouldReduceMotion
          ? { duration: 0.2 }
          : {
              type: 'spring',
              stiffness: 280,
              damping: 24,
              delay: delay,
            }
      }
      whileHover={
        hoverEffect && !shouldReduceMotion
          ? {
              scale: 1.02,
              y: -5,
              transition: { type: 'spring', stiffness: 400, damping: 25 },
            }
          : undefined
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-[2rem] bg-[#11131E]/60 border border-white/[0.08] backdrop-blur-3xl p-6 transition-all duration-500 group perspective-1000',
        'hover:border-white/[0.15]',
        onClick ? 'cursor-pointer select-none' : '',
        className
      )}
      style={{
        boxShadow: isHovered
          ? `0 30px 60px -15px rgba(0,0,0,0.8), 0 0 40px 0 ${glowColor}, inset 0 1px 0 0 rgba(255,255,255,0.2)`
          : '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      }}
      {...(props as any)}
    >
      {/* Static Specular Reflection Effect */}
      {hoverEffect && !shouldReduceMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background: `radial-gradient(500px circle at 50% 0%, rgba(255, 255, 255, 0.1), transparent 60%)`,
          }}
        />
      )}

      {/* Subtle Inner Glow */}
      {hoverEffect && !shouldReduceMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 mix-blend-overlay"
          style={{
            background: `radial-gradient(800px circle at 50% 100%, ${glowColor}, transparent 50%)`,
          }}
        />
      )}

      {/* Top Rim Shimmer Line */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Dynamic Border Gradient */}
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] border-[1.5px] border-transparent bg-gradient-to-br from-white/10 to-transparent [mask-image:linear-gradient(to_bottom,white,transparent)] group-hover:opacity-100 opacity-50 transition-opacity duration-500" />

      <div className="relative z-20">{children}</div>
    </motion.div>
  );
};

export default GlassCard;
