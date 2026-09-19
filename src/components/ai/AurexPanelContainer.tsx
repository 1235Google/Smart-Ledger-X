import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Minus, X, LayoutTemplate, Maximize2 } from 'lucide-react';
import { AurexCompactBubble } from './AurexCompactBubble';
import { AurexIconRail } from './AurexIconRail';
import { AurexHeader } from './AurexHeader';
import { AurexConversation, Message } from './AurexConversation';
import { AurexInput } from './AurexInput';

import { useStore } from '../../context/StoreContext';

export type PanelState = 'full' | 'bubble' | 'rail' | 'closed';

export const AurexPanelContainer: React.FC<{ state: PanelState, setState: (s: PanelState) => void }> = ({ state, setState }) => {
  const [width, setWidth] = useState(400);
  const { transactions } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Hello! I'm Aurex, I can help you summarize your finances or draft reminders. How can I assist you today?", timestamp: Date.now() }
  ]);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'g' || e.key.toLowerCase() === 'j')) {
        e.preventDefault();
        setState(state === 'closed' ? 'full' : 'closed');
      }
      if (e.key === 'Escape' && state === 'full') {
        setState('bubble');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, setState]);

  const handleSend = async (text: string, isRetry = false) => {
    let userMsg: Message;
    if (!isRetry) {
        userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
    } else {
        // Just use the last message if retrying
        userMsg = messages[messages.length - 1];
    }
    
    setIsThinking(true);

    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: isRetry ? userMsg.content : text, context: transactions, history: isRetry ? messages.slice(0, -1) : messages })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'AI API Error');
        }
        
        const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.response, timestamp: Date.now() };
        setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
        console.error(err);
        const errorMessage = err.message.includes('503') || err.message.includes('UNAVAILABLE')
            ? "I'm experiencing high demand right now. Please try your question again in a few seconds."
            : `Error: ${err.message}`;
        
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'assistant', 
            content: errorMessage, 
            timestamp: Date.now(),
            isError: true // We'll need to pass this to AurexConversation to render the retry button
        } as Message]);
    } finally {
        setIsThinking(false);
    }
  };

  if (state === 'closed') return null;
  if (state === 'bubble') return <AurexCompactBubble onClick={() => setState('full')} />;
  if (state === 'rail') return <AurexIconRail onExpand={() => setState('full')} onClose={() => setState('closed')} />;

  return (
    <motion.div 
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      className="fixed top-0 right-0 h-screen z-50 bg-[#0A0A0B] border-l border-white/[0.08] flex flex-col shadow-2xl"
      style={{ width: `${width}px` }}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#A78BFA] transition-colors"
        onMouseDown={(e) => {
          const startX = e.clientX;
          const startWidth = width;
          const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth - (moveEvent.clientX - startX);
            setWidth(Math.min(560, Math.max(320, newWidth)));
          };
          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
      />
      <AurexHeader 
        onMinimize={() => setState('bubble')} 
        onCollapse={() => setState('rail')} 
        onClose={() => setState('closed')} 
      />
      <AurexConversation messages={messages} isThinking={isThinking} onRetry={() => handleSend("", true)} />
      <AurexInput onSend={handleSend} />
    </motion.div>
  );
};
