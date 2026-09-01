import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Sparkles, Shield, 
  ArrowUpRight, ArrowDownLeft, Clock, Check, Bell, 
  Eye, Zap, Layers, Activity
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface ProductShowcaseVideoProps {
  onInteractiveClick?: () => void;
  balance?: number;
  totalReceived?: number;
  totalSent?: number;
  hasTransactions?: boolean;
}

export default function ProductShowcaseVideo({ 
  onInteractiveClick,
  balance = 0,
  totalReceived = 0,
  totalSent = 0,
  hasTransactions = false,
}: ProductShowcaseVideoProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('0:00');
  const [durationFormatted, setDurationFormatted] = useState('0:00');
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showLiveOverlay, setShowLiveOverlay] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Synchronize playback state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {
        // Autoplay may be deferred by browser policy
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const current = video.currentTime;
    const dur = video.duration;
    setProgress((current / dur) * 100);

    const formatTime = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    setCurrentTimeFormatted(formatTime(current));
    setDurationFormatted(formatTime(dur));
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = percentage * video.duration;
    setProgress(percentage * 100);
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const restartVideo = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
      setIsPlaying(true);
      setProgress(0);
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto select-none my-4">
      {/* Video Container Shell with Apple-grade dark obsidian frame & subtle rim lighting */}
      <div className="relative rounded-[32px] md:rounded-[40px] bg-gradient-to-b from-[#0e1322]/95 via-[#090d18]/98 to-[#050711]/100 border border-white/[0.15] shadow-[0_30px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(99,102,241,0.18)] backdrop-blur-3xl overflow-hidden p-4 sm:p-6 md:p-8 group">
        
        {/* Top Edge Specular Reflection */}
        <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Video Screen Area: 16:9 aspect container */}
        <div className="relative w-full aspect-[16/9] min-h-[340px] sm:min-h-[420px] md:min-h-[480px] rounded-[24px] bg-[#070a14] border border-white/[0.08] overflow-hidden flex items-center justify-center">
          
          {/* Native Financial Ocean Video */}
          <video
            ref={videoRef}
            src="/financial-ocean.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedData={() => setIsVideoLoaded(true)}
            className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01]"
          />

          {/* Video Dark Overlay for Glassmorphism Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050711]/90 via-[#070a14]/30 to-[#070a14]/60 pointer-events-none" />
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          {/* Interactive Live Financial HUD Overlay */}
          <AnimatePresence>
            {showLiveOverlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-4 sm:inset-6 flex flex-col justify-between pointer-events-none"
              >
                {/* HUD Top Bar */}
                <div className="flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-xl shadow-lg">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-cyan-300 tracking-wider">
                      FINANCIAL OCEAN • LIVE FEED
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowLiveOverlay(!showLiveOverlay)}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 backdrop-blur-md text-xs font-medium text-slate-300 transition-all flex items-center gap-1.5"
                    >
                      <Eye size={12} /> HUD
                    </button>
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                      <Shield size={12} /> AES-256
                    </div>
                  </div>
                </div>

                {/* HUD Center Glass Card: Real Ledger Summary */}
                <div className="max-w-md my-auto space-y-3 pointer-events-auto">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="p-4 sm:p-5 rounded-2xl bg-black/45 border border-white/[0.12] backdrop-blur-2xl shadow-2xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={14} className="text-cyan-400" /> Liquid Net Capital
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300">
                        {hasTransactions ? 'Live Feed' : 'Ready'}
                      </span>
                    </div>

                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {hasTransactions ? formatCurrency(balance) : '₹0.00'}
                    </div>

                    {/* Inflow & Outflow Chips */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.08]">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <ArrowDownLeft size={12} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">Inflow</p>
                          <p className="text-xs font-bold text-emerald-300">
                            {hasTransactions ? formatCurrency(totalReceived) : '₹0.00'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center">
                          <ArrowUpRight size={12} />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">Outflow</p>
                          <p className="text-xs font-bold text-rose-300">
                            {hasTransactions ? formatCurrency(totalSent) : '₹0.00'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* HUD Bottom Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>60 FPS • High Dynamic Range</span>
                  </div>
                  <span>{currentTimeFormatted} / {durationFormatted || 'Loop'}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Video Controls & Scrubber */}
        <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
          {/* Play/Pause & Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 transition-all flex items-center justify-center shadow-lg"
              title={isPlaying ? "Pause Animation" : "Play Animation"}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button
              onClick={restartVideo}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white border border-white/10 transition-all flex items-center justify-center shadow-lg"
              title="Replay from start"
            >
              <RotateCcw size={15} />
            </button>

            <span className="text-xs font-mono text-slate-400 ml-2 hidden sm:inline">
              {currentTimeFormatted}
            </span>
          </div>

          {/* Interactive Clickable Scrubber Progress Line */}
          <div 
            onClick={handleSeek}
            className="flex-1 max-w-xs md:max-w-md h-2 bg-white/[0.08] hover:bg-white/[0.15] rounded-full overflow-hidden relative cursor-pointer transition-colors"
            title="Click to seek"
          >
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 rounded-full transition-all duration-75"
            />
          </div>

          {/* Interactive Live Mode Trigger */}
          {onInteractiveClick && (
            <button
              onClick={onInteractiveClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5"
            >
              <Zap size={13} className="text-cyan-300" /> Open Ledger →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
