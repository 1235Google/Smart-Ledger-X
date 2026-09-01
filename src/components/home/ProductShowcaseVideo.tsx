import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Sparkles, Shield, 
  ArrowUpRight, ArrowDownLeft, Clock, Check, Bell
} from 'lucide-react';

interface ProductShowcaseVideoProps {
  onInteractiveClick?: () => void;
  balance?: number;
  totalReceived?: number;
  totalSent?: number;
  hasTransactions?: boolean;
}

// 8-12 second cinematic loop with 4 stages:
// Stage 0 (0-3s): Balance Overview & Liquid Asset Curve
// Stage 1 (3-6s): Income & Expense Velocity Flow
// Stage 2 (6-9s): Transaction Stream & Budget Progress
// Stage 3 (9-12s): AI Financial Assistant Analysis & Security Ring

export default function ProductShowcaseVideo({ 
  onInteractiveClick,
  balance = 0,
  totalReceived = 0,
  totalSent = 0,
  hasTransactions = false,
}: ProductShowcaseVideoProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 100% (12 seconds total)
  const [activeStage, setActiveStage] = useState<0 | 1 | 2 | 3>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const TOTAL_DURATION_MS = 11000; // 11 seconds loop

  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      return;
    }

    const updateLoop = (currentTime: number) => {
      if (lastTimeRef.current !== null) {
        const delta = currentTime - lastTimeRef.current;
        setProgress((prev) => {
          const next = (prev + (delta / TOTAL_DURATION_MS) * 100) % 100;
          
          // Map progress to stages (0-25%: Stage 0, 25-50%: Stage 1, 50-75%: Stage 2, 75-100%: Stage 3)
          if (next < 25) setActiveStage(0);
          else if (next < 50) setActiveStage(1);
          else if (next < 75) setActiveStage(2);
          else setActiveStage(3);

          return next;
        });
      }
      lastTimeRef.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const jumpToStage = (stage: 0 | 1 | 2 | 3) => {
    setActiveStage(stage);
    setProgress(stage * 25);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const restartVideo = () => {
    setProgress(0);
    setActiveStage(0);
    setIsPlaying(true);
  };

  // Camera perspective variations per stage for realistic product showcase
  const cameraTransforms = {
    0: { rotateX: 6, rotateY: -4, scale: 1, zIndex: 10 },
    1: { rotateX: 2, rotateY: 6, scale: 1.02, zIndex: 10 },
    2: { rotateX: -4, rotateY: -3, scale: 1.03, zIndex: 10 },
    3: { rotateX: 0, rotateY: 0, scale: 1.04, zIndex: 10 },
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto select-none my-4">
      {/* Video Container Shell with Apple-grade dark obsidian frame & subtle blue/purple rim lighting */}
      <div className="relative rounded-[32px] md:rounded-[40px] bg-gradient-to-b from-[#0e1322]/95 via-[#090d18]/98 to-[#050711]/100 border border-white/[0.15] shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(99,102,241,0.18)] backdrop-blur-3xl overflow-hidden p-4 sm:p-6 md:p-8 group">
        
        {/* Top Edge Specular Reflection */}
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Video Screen Area: 16:9 aspect container */}
        <div className="relative w-full aspect-[16/9] min-h-[340px] sm:min-h-[420px] md:min-h-[480px] rounded-[24px] bg-[#070a14] border border-white/[0.08] overflow-hidden flex items-center justify-center">
          
          {/* Subtle Ambient Background Gradients inside screen */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#070a14] to-[#04060d]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />

          {/* 3D Moving Dashboard Camera Stage */}
          <motion.div
            animate={{
              rotateX: cameraTransforms[activeStage].rotateX,
              rotateY: cameraTransforms[activeStage].rotateY,
              scale: cameraTransforms[activeStage].scale,
            }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
            className="relative w-[90%] sm:w-[86%] max-w-3xl h-[82%] rounded-2xl bg-white/[0.03] border border-white/[0.12] p-5 md:p-6 backdrop-blur-xl shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Top Bar inside simulated dashboard (Realistic Placeholder Symbols) */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-md bg-gradient-to-tr from-cyan-400 to-indigo-400" />
                </div>
                <div className="space-y-1">
                  <div className="w-24 h-2.5 bg-white/40 rounded-full" />
                  <div className="w-14 h-1.5 bg-white/20 rounded-full" />
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <div className="w-16 h-2 bg-emerald-400/30 rounded-full" />
                <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center ml-2">
                  <Shield size={13} className="text-cyan-300" />
                </div>
              </div>
            </div>

            {/* Dynamic Stage Content: Clean, Abstract & Realistic (No text, no fake claims) */}
            <div className="my-auto py-2">
              <AnimatePresence mode="wait">
                {/* STAGE 0: Balance & Liquid Asset Overview */}
                {activeStage === 0 && (
                  <motion.div
                    key="stage-0"
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ duration: 0.6 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                  >
                    <div className="md:col-span-6 space-y-3">
                      <div className="w-20 h-2 bg-slate-400/40 rounded-full" />
                      {/* Geometric Balance Representation */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-400/20 flex items-center justify-center text-cyan-300 font-bold text-lg">
                          ₹
                        </div>
                        <div className="w-48 h-8 bg-gradient-to-r from-white via-slate-200 to-slate-400/50 rounded-xl" />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-16 h-3 bg-emerald-400/30 rounded-full" />
                        <div className="w-24 h-2 bg-white/20 rounded-full" />
                      </div>
                    </div>

                    {/* Smooth Spline Curve Graphic */}
                    <div className="md:col-span-6 h-28 bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-end relative overflow-hidden">
                      <svg className="w-full h-20 overflow-visible" viewBox="0 0 300 70" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="vidCurve" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <motion.path
                          d="M0,55 Q50,15 100,35 T200,20 T300,10 L300,70 L0,70 Z"
                          fill="url(#vidCurve)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.8 }}
                        />
                        <motion.path
                          d="M0,55 Q50,15 100,35 T200,20 T300,10"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                        <circle cx="298" cy="10" r="4" fill="#34d399" className="animate-ping" />
                        <circle cx="298" cy="10" r="3.5" fill="#34d399" />
                      </svg>
                      <div className="flex justify-between items-center pt-2">
                        <div className="w-8 h-1.5 bg-white/20 rounded-full" />
                        <div className="w-8 h-1.5 bg-white/20 rounded-full" />
                        <div className="w-8 h-1.5 bg-white/20 rounded-full" />
                        <div className="w-8 h-1.5 bg-cyan-400/40 rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STAGE 1: Income vs Expense Visualization */}
                {activeStage === 1 && (
                  <motion.div
                    key="stage-1"
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ duration: 0.6 }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  >
                    {/* Inflow Card */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <ArrowDownLeft size={14} />
                        </div>
                        <div className="w-8 h-2 bg-emerald-400/40 rounded-full" />
                      </div>
                      <div className="w-24 h-4 bg-emerald-300/60 rounded-md" />
                      <div className="w-full bg-emerald-500/20 h-1.5 rounded-full overflow-hidden">
                        <div className="w-[85%] h-full bg-emerald-400 rounded-full" />
                      </div>
                    </div>

                    {/* Outflow Card */}
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                          <ArrowUpRight size={14} />
                        </div>
                        <div className="w-8 h-2 bg-rose-400/40 rounded-full" />
                      </div>
                      <div className="w-20 h-4 bg-rose-300/60 rounded-md" />
                      <div className="w-full bg-rose-500/20 h-1.5 rounded-full overflow-hidden">
                        <div className="w-[45%] h-full bg-rose-400 rounded-full" />
                      </div>
                    </div>

                    {/* Savings Buffer Card */}
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2 col-span-2 sm:col-span-1">
                      <div className="flex items-center justify-between">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <Sparkles size={14} />
                        </div>
                        <div className="w-8 h-2 bg-indigo-400/40 rounded-full" />
                      </div>
                      <div className="w-22 h-4 bg-indigo-300/60 rounded-md" />
                      <div className="w-full bg-indigo-500/20 h-1.5 rounded-full overflow-hidden">
                        <div className="w-[70%] h-full bg-indigo-400 rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STAGE 2: Transaction History & Budget Meters */}
                {activeStage === 2 && (
                  <motion.div
                    key="stage-2"
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-2.5"
                  >
                    {[1, 2, 3].map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            idx === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                            idx === 1 ? 'bg-indigo-500/20 text-indigo-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {idx === 0 ? <ArrowDownLeft size={16} /> :
                             idx === 1 ? <ArrowUpRight size={16} /> :
                             <Clock size={16} />}
                          </div>
                          <div className="space-y-1">
                            <div className="w-28 h-2.5 bg-white/50 rounded-full" />
                            <div className="w-16 h-1.5 bg-white/20 rounded-full" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className={`w-14 h-3 rounded-md ${
                            idx === 0 ? 'bg-emerald-400/40' :
                            idx === 1 ? 'bg-rose-400/40' :
                            'bg-amber-400/40'
                          }`} />
                          <div className="w-2 h-2 rounded-full bg-white/20" />
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* STAGE 3: AI Financial Assistant Visual & Intelligence Wave */}
                {activeStage === 3 && (
                  <motion.div
                    key="stage-3"
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -15, scale: 0.98 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    {/* Glowing Apple-style Intelligence Orb */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center flex-shrink-0">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/30 via-indigo-500/30 to-purple-500/30 blur-xl animate-pulse" />
                      
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                        className="absolute inset-1 rounded-full border border-cyan-400/30 border-t-indigo-400/80"
                      />

                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-0.5 shadow-[0_0_30px_rgba(56,189,248,0.6)] flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-[#080d1a] flex items-center justify-center">
                          <Sparkles size={22} className="text-cyan-300" />
                        </div>
                      </div>
                    </div>

                    {/* AI Insight Analysis Cards */}
                    <div className="flex-1 space-y-2 w-full">
                      <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="w-36 h-2.5 bg-indigo-200/60 rounded-full" />
                          <div className="w-48 h-1.5 bg-indigo-200/30 rounded-full" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                          <Check size={13} />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="w-32 h-2.5 bg-cyan-200/60 rounded-full" />
                          <div className="w-40 h-1.5 bg-cyan-200/30 rounded-full" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                          <Bell size={13} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Bar: Abstract Footer Grid */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400/30" />
                <div className="w-20 h-1.5 bg-white/20 rounded-full" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-1.5 bg-white/30 rounded-full" />
                <div className="w-4 h-1.5 bg-white/30 rounded-full" />
                <div className="w-4 h-1.5 bg-white/30 rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Cinematic Video Controls & Stage Timeline Bar */}
        <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
          {/* Play/Pause & Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 transition-all flex items-center justify-center"
              title={isPlaying ? "Pause Showcase" : "Play Showcase"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={restartVideo}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white border border-white/10 transition-all flex items-center justify-center"
              title="Replay from start"
            >
              <RotateCcw size={14} />
            </button>

            {/* Stage Selector Dots */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2 bg-white/[0.03] p-1 rounded-xl border border-white/5">
              {[0, 1, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => jumpToStage(s as any)}
                  className={`h-2 rounded-full transition-all ${
                    activeStage === s
                      ? 'w-6 bg-gradient-to-r from-cyan-400 to-indigo-400'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Continuous Scrubber Progress Line (0-11s) */}
          <div className="flex-1 max-w-xs md:max-w-md h-1.5 bg-white/[0.08] rounded-full overflow-hidden relative">
            <motion.div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 rounded-full"
            />
          </div>

          {/* Interactive Live Mode Trigger */}
          {onInteractiveClick && (
            <button
              onClick={onInteractiveClick}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              Explore Live App →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
