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
        'relative overflow-hidden rounded-[24px] sm:rounded-[28px] bg-[#191b22] border border-white/[0.08] backdrop-blur-2xl p-6 transition-all duration-300 group',
        'hover:border-white/[0.14] hover:bg-[#1e2029]',
        onClick ? 'cursor-pointer select-none' : '',
        className
      )}
      style={{
        boxShadow: isHovered
          ? `0 20px 40px -10px rgba(0,0,0,0.7), 0 0 30px 0 ${glowColor}, inset 0 1px 0 0 rgba(255,255,255,0.12)`
          : '0 12px 32px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      }}
      {...(props as any)}
    >
      {/* Top Rim Shimmer Line */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-20">{children}</div>
    </motion.div>
  );
};

export default GlassCard;
