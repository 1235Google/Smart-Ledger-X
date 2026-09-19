import React, { useState } from 'react';
import { Sparkles, Send, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AICommandPalette: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsThinking(true);
    setResponse(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();
      setResponse(data.response);
    } catch (e) {
      setResponse("Sorry, I encountered an error.");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className={cn("fixed top-[20vh] left-1/2 -translate-x-1/2 z-50 w-[600px] bg-[#111113] border border-white/10 rounded-2xl p-6 shadow-2xl", isThinking && "border-sweep")}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-[#FAFAFA]">
                <Sparkles size={18} className="text-[#635BFF]" />
                <span className="font-semibold">Gemini Co-pilot</span>
              </div>
              <button onClick={onClose} className="text-[#8B8FA3] hover:text-[#FAFAFA]"><X size={18} /></button>
            </div>

            {isThinking ? (
              <div className="text-xl font-medium shimmer-text py-12 text-center">Analyzing your ledger...</div>
            ) : response ? (
              <div className="text-[#FAFAFA]/90 py-4 max-h-[40vh] overflow-y-auto">{response}</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {['Summarize my financial position', 'Draft reminder for Vikas', 'Explain total receivables'].map(q => (
                  <button key={q} onClick={() => setInput(q)} className="p-4 bg-white/[0.03] border border-white/5 rounded-xl text-left text-sm text-[#FAFAFA]/70 hover:border-[#635BFF]/30 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-xl p-2">
              <input 
                value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Gemini anything..."
                className="flex-1 bg-transparent p-2 text-[#FAFAFA] outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button onClick={handleSubmit} className="p-2 bg-[#635BFF] text-white rounded-lg"><Send size={16} /></button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
import { cn } from '../../lib/utils';
