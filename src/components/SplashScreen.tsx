import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Sparkles } from 'lucide-react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Cinematic launch duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 550); // Wait for exit animation
    }, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] bg-[#000000] flex items-center justify-center overflow-hidden select-none"
        >
          {/* Dynamic VisionOS Ambient Orbs */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 0.4, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-gradient-to-tr from-[#0a84ff]/30 via-[#bf5af2]/20 to-[#64d2ff]/30 blur-[130px] rounded-full pointer-events-none"
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Liquid Glass Apple VisionOS Shield Emblem */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 25, filter: 'blur(8px)' }}
              animate={{ scale: 1, opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ 
                duration: 0.85, 
                ease: [0.16, 1, 0.3, 1],
                delay: 0.05 
              }}
              className="relative group"
            >
              {/* Outer Radiant Glow */}
              <div className="absolute -inset-5 bg-gradient-to-r from-[#0a84ff]/40 via-[#5e5ce6]/40 to-[#bf5af2]/40 blur-2xl opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
              
              {/* Liquid Glass Container */}
              <div className="relative w-24 h-24 vision-glass-elevated border border-white/25 rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center overflow-hidden">
                {/* Specular Highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                
                {/* Inner glass light sweep */}
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none"
                />

                <Wallet className="text-white w-11 h-11 drop-shadow-[0_0_20px_rgba(10,132,255,0.7)] relative z-10" />
              </div>
            </motion.div>

            {/* Brand Title Lockup */}
            <motion.div
              initial={{ opacity: 0, y: 15, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 text-center"
            >
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
                <span>SmartLedger</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0a84ff] to-[#64d2ff]">
                  X
                </span>
              </h1>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-[#86868b] flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] shadow-[0_0_8px_#30d158]" />
                VisionOS Financial Engine
              </p>
            </motion.div>

            {/* Precision Liquid Progress Capsule */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-8 w-44 h-1.5 bg-white/[0.08] p-0.5 rounded-full overflow-hidden border border-white/10 shadow-inner"
            >
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="h-full bg-gradient-to-r from-[#0a84ff] via-[#5e5ce6] to-[#64d2ff] rounded-full shadow-[0_0_12px_rgba(10,132,255,0.9)]"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
