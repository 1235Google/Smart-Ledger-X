import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const renderWithChips = (text: string) => {
    const parts = text.split(/(₹[0-9,]+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('₹')) {
            return <span key={i} className="px-1.5 py-0.5 rounded bg-[#A78BFA]/20 text-[#E9D5FF] font-semibold border border-[#A78BFA]/30">{part}</span>;
        }
        return part;
    });
};

export const AurexConversation: React.FC<{ messages: Message[], isThinking: boolean }> = ({ messages, isThinking }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages, isThinking]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((m) => (
        <div key={m.id} className={cn("flex gap-3", m.role === 'user' ? 'justify-end' : '')}>
          {m.role === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-[#A78BFA]" />
            </div>
          )}
          <div className={cn("p-3 rounded-xl max-w-[85%] text-sm", m.role === 'user' ? 'bg-[#635BFF]/10 text-white' : 'text-[#FAFAFA]/90')}>
            {renderWithChips(m.content)}
          </div>
        </div>
      ))}
      {isThinking && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-[#A78BFA]" />
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] flex gap-1">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]" />
          </div>
        </div>
      )}
    </div>
  );
};
