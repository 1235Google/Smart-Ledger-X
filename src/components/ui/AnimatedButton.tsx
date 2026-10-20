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
    sm: 'px-3.5 py-1.5 text-xs rounded-full gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-full gap-2 font-semibold',
    lg: 'px-6 py-3 text-base rounded-full gap-2.5 font-bold',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-95 shadow-xs font-semibold',
    secondary:
      'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-surface-container-high)] font-semibold',
    outline:
      'bg-transparent border border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] font-semibold',
    danger:
      'bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)] hover:opacity-95 shadow-xs font-semibold',
    success:
      'bg-[var(--md-sys-color-success)] text-[var(--md-sys-color-on-success)] hover:opacity-95 shadow-xs font-semibold',
    ghost:
      'bg-transparent text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] font-semibold',
  }[variant];

  return (
    <motion.button
      ref={buttonRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      whileHover={
        !disabled && !shouldReduceMotion
          ? { scale: 1.01 }
          : undefined
      }
      whileTap={
        !disabled && !shouldReduceMotion
          ? { scale: 0.98 }
          : undefined
      }
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        'relative overflow-hidden inline-flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] disabled:opacity-40 disabled:cursor-not-allowed select-none cursor-pointer',
        sizeClasses,
        variantClasses,
        className
      )}
      {...(props as any)}
    >
      {/* Ripple elements */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.3 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          onAnimationComplete={() => removeRipple(ripple.id)}
          className="absolute bg-current rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-20"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '80px',
            height: '80px',
          }}
        />
      ))}

      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : icon ? (
        <motion.span 
          className="shrink-0"
          animate={isHovered ? { scale: 1.08 } : { scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          {icon}
        </motion.span>
      ) : null}

      <span className="relative z-10 whitespace-nowrap">{children}</span>
    </motion.button>
  );
};

export default AnimatedButton;
