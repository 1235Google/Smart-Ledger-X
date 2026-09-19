import React from 'react';
import { Sparkles, Minus, X, LayoutTemplate } from 'lucide-react';

export const AurexHeader: React.FC<{ onMinimize: () => void; onCollapse: () => void; onClose: () => void }> = ({ onMinimize, onCollapse, onClose }) => (
  <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.08] shrink-0">
    <div className="flex items-center gap-2 text-[#FAFAFA]">
      <Sparkles size={16} className="text-[#A78BFA]" />
      <span className="font-semibold text-sm">Aurex AI</span>
    </div>
    <div className="flex items-center gap-1">
      <button onClick={onMinimize} className="p-1.5 rounded hover:bg-white/[0.06]"><Minus size={14} /></button>
      <button onClick={onCollapse} className="p-1.5 rounded hover:bg-white/[0.06]"><LayoutTemplate size={14} /></button>
      <button onClick={onClose} className="p-1.5 rounded hover:bg-white/[0.06]"><X size={14} /></button>
    </div>
  </div>
);
