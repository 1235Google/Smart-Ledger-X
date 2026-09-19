import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../../lib/utils';

export const AurexInput: React.FC<{ onSend: (text: string) => void }> = ({ onSend }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      onSend(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="p-4 border-t border-white/[0.08] shrink-0">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {['Summarize my financial position', 'Draft reminder for Vikas', 'Explain outstanding receivables'].map(action => (
          <button 
            key={action} 
            onClick={() => onSend(action)}
            className="px-3 py-1 rounded-full text-xs border border-white/[0.08] hover:border-[#A78BFA]/30 text-[#8B8FA3] hover:text-[#FAFAFA] transition-all shrink-0"
          >
            {action.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="relative flex items-center bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden focus-within:border-[#635BFF]">
        <input 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="w-full bg-transparent p-3 text-sm text-[#FAFAFA] outline-none" 
          placeholder="Ask Aurex anything..." 
        />
        <button 
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className={cn("absolute right-2 p-1.5 bg-[#635BFF] text-white rounded-lg transition-opacity", !inputValue.trim() && "opacity-40 cursor-not-allowed")}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};
