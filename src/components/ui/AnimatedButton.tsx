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
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || shouldReduceMotion || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Subtle magnetic attraction
    const offsetX = (e.clientX - centerX) * 0.12;
    const offsetY = (e.clientY - centerY) * 0.12;
    setMagneticOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMagneticOffset({ x: 0, y: 0 });
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
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-2xl gap-2 font-semibold',
    lg: 'px-7 py-3.5 text-base rounded-2xl gap-2.5 font-bold',
  }[size];

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-blue-500/25 border border-white/20 hover:shadow-blue-500/45 hover:border-white/30',
    secondary:
      'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 backdrop-blur-md shadow-lg shadow-black/20',
    outline:
      'bg-transparent border border-white/20 hover:border-blue-400/60 text-slate-200 hover:text-white hover:bg-white/5 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]',
    danger:
      'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-500/25 border border-white/20 hover:shadow-rose-500/45 hover:border-white/30',
    success:
      'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-white/20 hover:shadow-emerald-500/45 hover:border-white/30',
    ghost:
      'bg-transparent text-slate-300 hover:text-white hover:bg-white/10',
  }[variant];

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      animate={
        !disabled && !shouldReduceMotion
          ? { x: magneticOffset.x, y: magneticOffset.y }
          : { x: 0, y: 0 }
      }
      whileHover={
        !disabled && !shouldReduceMotion
          ? { y: -2, scale: 1.02 }
          : undefined
      }
      whileTap={
        !disabled && !shouldReduceMotion
          ? { scale: 0.95 }
          : undefined
      }
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        'relative overflow-hidden inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed select-none group',
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
