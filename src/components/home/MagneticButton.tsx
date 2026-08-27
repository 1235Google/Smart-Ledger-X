import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';

interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'glass' | 'glow';
  disabled?: boolean;
}

export default function MagneticButton({
  children,
  onClick,
  className = '',
  variant = 'primary',
  disabled = false,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.25;
    const y = (clientY - (top + height / 2)) * 0.25;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-indigo-500 via-blue-600 to-cyan-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_45px_rgba(99,102,241,0.6)] border border-indigo-300/30';
      case 'glow':
        return 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-bold shadow-[0_0_30px_rgba(45,212,191,0.4)] hover:shadow-[0_0_45px_rgba(45,212,191,0.7)] border border-cyan-200/50';
      case 'secondary':
        return 'bg-white/10 hover:bg-white/15 text-white border border-white/20 backdrop-blur-xl shadow-lg';
      case 'glass':
      default:
        return 'bg-[#0f172a]/80 hover:bg-[#1e293b]/90 text-slate-100 border border-white/10 hover:border-indigo-500/40 backdrop-blur-2xl shadow-xl';
    }
  };

  return (
    <motion.button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 220, damping: 15, mass: 0.2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center px-7 py-3.5 rounded-2xl text-sm font-semibold tracking-wide transition-colors duration-200 overflow-hidden group select-none cursor-pointer ${getVariantStyles()} ${className}`}
    >
      {/* Dynamic light sweep sheen */}
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
