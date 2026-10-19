import React, { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  isLoading = false,
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setRipples((prev) => [...prev, { x, y, id: Date.now() }]);
    }

    if (onClick) onClick(e);
  };

  const removeRipple = (id: number) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs rounded-full gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-full gap-2 font-semibold',
    lg: 'px-7 py-3.5 text-base rounded-full gap-2.5 font-bold',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#0a84ff] text-white hover:bg-[#0a84ff]/90 shadow-[0_4px_16px_rgba(10,132,255,0.3)] border border-[#0a84ff]/40 font-semibold',
    secondary:
      'bg-[#1e1e1e] text-[#f5f5f7] hover:bg-[#282828] border border-white/[0.08] shadow-sm font-semibold',
    outline:
      'bg-transparent border border-white/[0.12] hover:bg-white/[0.06] text-[#f5f5f7] hover:text-white',
    danger:
      'bg-[#ff453a] text-white hover:bg-[#ff453a]/90 shadow-[0_4px_16px_rgba(255,69,58,0.25)] border border-[#ff453a]/40 font-semibold',
    success:
      'bg-[#30d158] text-black hover:bg-[#30d158]/90 shadow-[0_4px_16px_rgba(48,209,88,0.25)] border border-[#30d158]/40 font-bold',
    ghost:
      'bg-transparent text-[#a1a1a6] hover:text-white hover:bg-white/[0.06]',
  }[variant];

  return (
    <motion.button
      ref={buttonRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      whileHover={
        !disabled && !shouldReduceMotion
          ? { y: -1, scale: 1.01 }
          : undefined
      }
      whileTap={
        !disabled && !shouldReduceMotion
          ? { scale: 0.98 }
          : undefined
      }
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        'relative overflow-hidden inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] disabled:opacity-40 disabled:cursor-not-allowed select-none group',
        sizeClasses,
        variantClasses,
        className
      )}
      {...(props as any)}
    >
      {/* Light Sheen Sweep Effect on Hover */}
      {!disabled && !shouldReduceMotion && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      )}

      {/* Ripple elements */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.45 }}
          animate={{ scale: 3.5, opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          onAnimationComplete={() => removeRipple(ripple.id)}
          className="absolute bg-white/40 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '100px',
            height: '100px',
          }}
        />
      ))}

      {isLoading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
      ) : icon ? (
        <motion.span 
          className="shrink-0"
          animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          {icon}
        </motion.span>
      ) : null}

      <span className="relative z-10 whitespace-nowrap font-semibold">{children}</span>
    </motion.button>
  );
};

export default AnimatedButton;
