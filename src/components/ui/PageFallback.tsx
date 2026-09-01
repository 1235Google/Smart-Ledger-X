import React from 'react';

export default function PageFallback() {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 text-neutral-400">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute w-4 h-4 rounded-full bg-indigo-500/10 animate-ping"></div>
      </div>
      <p className="text-xs text-neutral-500 font-medium tracking-wide mt-3 font-mono">
        Loading module...
      </p>
    </div>
  );
}
