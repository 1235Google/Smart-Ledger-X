import React from 'react';
import { Sparkles } from 'lucide-react';

export const AISidebarItem: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/[0.03] transition-colors text-[#FAFAFA] text-sm font-medium"
  >
    <Sparkles size={16} className="text-[#635BFF] animate-pulse" />
    Ask Gemini
  </button>
);
