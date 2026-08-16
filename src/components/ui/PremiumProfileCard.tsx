import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useStore } from '../../context/StoreContext';
import { BadgeCheck, Sparkles, Wallet, Activity, ArrowDownLeft, ArrowUpRight, Globe, Clock, User } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';

export default function PremiumProfileCard() {
  const { userProfile, transactions, currentBalance, dataStatus, generalSettings } = useStore();
  
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Mouse interaction states
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });
  const [glareOpacity, setGlareOpacity] = useState(0);

  // Auto flip logic
  useEffect(() => {
    if (isHovered) return;
    
    const interval = setInterval(() => {
      setIsFlipped(prev => !prev);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateXValue = ((y - centerY) / centerY) * -12;
    const rotateYValue = ((x - centerX) / centerX) * 12;
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
    
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlarePosition({ x: glareX, y: glareY });
    setGlareOpacity(0.15);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlareOpacity(0);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Safe data extraction from store
  const totalReceived = (transactions || []).filter(t => t.type === 'received').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const pendingPayments = (transactions || []).filter(t => t.type === 'pending' && t.status === 'pending').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalTx = transactions?.length || 0;
  
  // Omit fake fields by only conditionally rendering them if they exist in userProfile
  return (
    <div className="relative perspective-1000 w-full max-w-xl mx-auto h-[260px] sm:h-[280px] mb-8 z-20">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{
          rotateX: rotateX,
          rotateY: isFlipped ? rotateY + 180 : rotateY,
          z: isHovered ? 30 : 0,
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{
          rotateX: { type: 'spring', stiffness: 350, damping: 30 },
          rotateY: { type: 'spring', stiffness: 350, damping: 30 },
          z: { type: 'spring', stiffness: 350, damping: 30 },
          scale: { type: 'spring', stiffness: 350, damping: 30 },
        }}
        style={{ transformStyle: 'preserve-3d' }}
        className="w-full h-full relative cursor-pointer group"
      >
        {/* Glow behind card */}
        <div 
          className={cn(
            "absolute -inset-1 bg-gradient-to-tr from-indigo-500/50 via-purple-500/50 to-cyan-500/50 rounded-[28px] blur-2xl transition-all duration-700",
            isHovered ? "opacity-100 scale-105" : "opacity-40 scale-100"
          )} 
          style={{ transform: 'translateZ(-10px)' }} 
        />
        
        {/* FRONT FACE */}
        <div 
          className={cn(
            "absolute inset-0 w-full h-full rounded-[24px] overflow-hidden border border-white/[0.12] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] backface-hidden",
            "bg-[#0A0B10]/80 backdrop-blur-3xl transition-colors duration-500",
            isHovered ? "border-white/[0.25]" : ""
          )}
          style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
        >
          {/* Glass glare */}
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: glareOpacity,
              background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 50%)`
            }}
          />
          {/* Holographic overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-60 pointer-events-none" />
          
          <div className="p-6 sm:p-8 h-full flex flex-col justify-between relative z-10">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900 to-black p-[1px] shadow-lg">
                  <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <div className="font-bold tracking-[0.2em] text-[10px] text-white uppercase font-mono">SmartLedger</div>
                  <div className="text-[9px] text-cyan-400/80 font-medium uppercase tracking-widest">Digital Identity</div>
                </div>
              </div>
              
              {userProfile?.verifiedEmail && (
                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <BadgeCheck size={12} className="text-emerald-400" /> Verified
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex items-center gap-5 sm:gap-6 mt-4">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 rounded-2xl blur-md opacity-60 transition duration-300 group-hover:opacity-100" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[18px] overflow-hidden border border-white/20 bg-slate-900 shadow-inner flex items-center justify-center">
                  {userProfile?.profilePhoto ? (
                    <img src={userProfile.profilePhoto} alt={userProfile.fullName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500" />
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate tracking-tight mb-1">
                  {userProfile?.fullName || 'Anonymous User'}
                </h1>
                {userProfile?.email && (
                  <p className="text-slate-400 text-[11px] sm:text-xs font-mono truncate">{userProfile.email}</p>
                )}
                {userProfile?.mobile && (
                  <p className="text-slate-500 text-[10px] font-mono mt-1.5 truncate">{userProfile.mobile}</p>
                )}
              </div>
            </div>

            {/* Footer / Status */}
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Sync Status</span>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 font-mono">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> 
                  {dataStatus === 'success' ? 'Live' : 'Local'}
                </div>
              </div>
              {userProfile?.memberSince && (
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest mb-0.5">Member Since</span>
                  <span className="text-[10px] font-bold text-slate-300 font-mono">{userProfile.memberSince}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div 
          className={cn(
            "absolute inset-0 w-full h-full rounded-[24px] overflow-hidden border border-white/[0.12] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)] backface-hidden",
            "bg-[#0A0B10]/95 backdrop-blur-3xl transition-colors duration-500",
            isHovered ? "border-white/[0.25]" : ""
          )}
          style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Glass glare */}
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: glareOpacity,
              background: `radial-gradient(circle at ${100 - glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 50%)`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/15 via-transparent to-cyan-500/15 pointer-events-none" />
          
          <div className="p-6 h-full flex flex-col relative z-10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Account Insights
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-6 flex-1 content-center">
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Wallet size={10} className="text-white/40" /> Current Balance
                </span>
                <span className="text-sm sm:text-base font-bold text-white font-mono font-tabular">{formatCurrency(currentBalance || 0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Activity size={10} className="text-white/40" /> Transactions
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-200 font-mono font-tabular">{totalTx} Total</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <ArrowDownLeft size={10} className="text-emerald-400/60" /> Total Received
                </span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono font-tabular">{formatCurrency(totalReceived || 0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <ArrowUpRight size={10} className="text-amber-400/60" /> Pending Dues
                </span>
                <span className="text-sm sm:text-base font-bold text-amber-400 font-mono font-tabular">{formatCurrency(pendingPayments || 0)}</span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
              {generalSettings?.timezone && (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase tracking-widest">
                  <Globe size={10} className="text-slate-500" /> {generalSettings.timezone}
                </div>
              )}
              {userProfile?.lastLogin && (
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase tracking-widest">
                  <Clock size={10} className="text-slate-500" /> {typeof userProfile.lastLogin === 'string' ? userProfile.lastLogin.split(',')[0] : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
