import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function AnimatedDeviceGraphic({ type, isCurrent }: { type?: string, isCurrent?: boolean }) {
  const isMobile = type === 'mobile';
  const isTablet = type === 'tablet';
  const isLaptop = type === 'laptop';
  
  if (isMobile) {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center perspective-1000">
        <motion.div 
          animate={{ rotateY: [-10, 10, -10], rotateX: [5, -5, 5] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className={cn(
            "relative w-9 h-14 rounded-2xl border shadow-2xl flex flex-col items-center overflow-hidden z-10",
            isCurrent ? "bg-[#0c0d12] border-[#0a84ff]/50 shadow-[#0a84ff]/20" : "bg-[#171717] border-white/10 shadow-black/50"
          )}
        >
          {/* Dynamic Island / Notch */}
          <div className="w-3.5 h-1.5 bg-black rounded-full mt-0.5 absolute top-0 z-20" />
          
          {/* Screen glow */}
          {isCurrent ? (
            <div className="absolute inset-0.5 bg-gradient-to-br from-[#0a84ff]/40 via-[#5e5ce6]/20 to-transparent rounded-xl" />
          ) : (
            <div className="absolute inset-0.5 bg-gradient-to-br from-white/10 to-transparent rounded-xl" />
          )}

          {/* Glare */}
          <div className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 -translate-y-1/2 pointer-events-none" />
        </motion.div>
        
        {/* Glow behind */}
        {isCurrent && (
          <div className="absolute inset-0 bg-[#0a84ff]/20 blur-xl rounded-full" />
        )}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center perspective-1000">
        <motion.div 
          animate={{ rotateY: [-8, 8, -8], rotateX: [4, -4, 4] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className={cn(
            "relative w-11 h-14 rounded-xl border shadow-2xl flex flex-col items-center overflow-hidden z-10",
            isCurrent ? "bg-[#0c0d12] border-[#0a84ff]/50 shadow-[#0a84ff]/20" : "bg-[#171717] border-white/10 shadow-black/50"
          )}
        >
          <div className="w-1.5 h-1.5 bg-neutral-800 rounded-full mt-1 absolute top-0 z-20" />
          {isCurrent ? (
            <div className="absolute inset-0.5 bg-gradient-to-br from-[#0a84ff]/40 via-[#5e5ce6]/20 to-transparent rounded-lg" />
          ) : (
            <div className="absolute inset-0.5 bg-gradient-to-br from-white/10 to-transparent rounded-lg" />
          )}
          <div className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 -translate-y-1/2 pointer-events-none" />
        </motion.div>
        {isCurrent && (
          <div className="absolute inset-0 bg-[#0a84ff]/20 blur-xl rounded-full" />
        )}
      </div>
    );
  }

  if (isLaptop) {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center perspective-1000">
        <motion.div
          animate={{ rotateY: [6, -6, 6], rotateX: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
          className="relative flex flex-col items-center z-10"
        >
          {/* Laptop Screen Lid */}
          <div className={cn(
            "relative w-13 h-8 rounded-t-md border overflow-hidden shadow-2xl",
            isCurrent ? "bg-[#0c0d12] border-[#0a84ff]/50 shadow-[#0a84ff]/20" : "bg-[#171717] border-white/10 shadow-black/50"
          )}>
            {isCurrent ? (
              <div className="absolute inset-0.5 bg-gradient-to-br from-[#0a84ff]/40 via-[#5e5ce6]/20 to-transparent rounded-sm" />
            ) : (
              <div className="absolute inset-0.5 bg-gradient-to-br from-white/10 to-transparent rounded-sm" />
            )}
            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-black rounded-full" />
            <div className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 -translate-y-1/2 pointer-events-none" />
          </div>
          {/* Laptop Base Keyboard */}
          <div className={cn(
            "w-15 h-1.5 rounded-b-md border-t border-black/40 flex items-center justify-center",
            isCurrent ? "bg-gradient-to-b from-[#0a84ff]/40 to-[#0a84ff]/10" : "bg-gradient-to-b from-white/20 to-white/5"
          )}>
            <div className="w-4 h-0.5 bg-white/20 rounded-full" />
          </div>
        </motion.div>

        {isCurrent && (
          <div className="absolute inset-0 bg-[#0a84ff]/20 blur-xl rounded-full" />
        )}
      </div>
    );
  }

  // Desktop / Monitor
  return (
    <div className="relative w-16 h-16 flex items-center justify-center perspective-1000">
      <motion.div
        animate={{ rotateY: [5, -5, 5], rotateX: [-2, 2, -2] }}
        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        className="relative flex flex-col items-center z-10"
      >
        {/* Monitor Screen */}
        <div className={cn(
          "relative w-14 h-9 rounded-lg border overflow-hidden shadow-2xl",
          isCurrent ? "bg-[#0c0d12] border-[#0a84ff]/50 shadow-[#0a84ff]/20" : "bg-[#171717] border-white/10 shadow-black/50"
        )}>
           {/* Screen glow */}
           {isCurrent ? (
            <div className="absolute inset-0.5 bg-gradient-to-br from-[#0a84ff]/40 via-[#5e5ce6]/20 to-transparent rounded-md" />
          ) : (
            <div className="absolute inset-0.5 bg-gradient-to-br from-white/10 to-transparent rounded-md" />
          )}
          {/* Menu bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/10" />
          {/* Glare */}
          <div className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 -translate-y-1/2 pointer-events-none" />
        </div>
        {/* Stand neck */}
        <div className={cn(
          "w-2 h-2",
          isCurrent ? "bg-gradient-to-b from-[#0a84ff]/60 to-[#0a84ff]/20" : "bg-gradient-to-b from-white/20 to-white/5"
        )} />
        {/* Stand base */}
        <div className={cn(
          "w-6 h-1 rounded-t-sm",
          isCurrent ? "bg-[#0a84ff]" : "bg-white/20"
        )} />
      </motion.div>

      {/* Glow behind */}
      {isCurrent && (
        <div className="absolute inset-0 bg-[#0a84ff]/20 blur-xl rounded-full" />
      )}
    </div>
  );
}
