import React from 'react';
import { Sparkles, Maximize2, X } from 'lucide-react';

export const AurexIconRail: React.FC<{ onExpand: () => void; onClose: () => void }> = ({ onExpand, onClose }) => (
  <div className="fixed top-0 right-0 h-screen w-16 bg-[#0A0A0B] border-l border-white/[0.08] flex flex-col items-center py-4 gap-4 z-50">
    <button onClick={onExpand}><Sparkles size={20} className="text-[#A78BFA]" /></button>
    <div className="flex-1" />
    <button onClick={onExpand}><Maximize2 size={16} /></button>
    <button onClick={onClose}><X size={16} /></button>
  </div>
);
