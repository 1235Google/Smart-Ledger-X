import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function AboutSection() {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex items-center gap-4 relative overflow-hidden"
    >
      <motion.div
        whileHover={{ scale: 1.03 }}
        className="relative w-20 h-20 shrink-0"
      >
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-teal-400 to-purple-500 
                        opacity-40 blur-md animate-pulse motion-reduce:animate-none" />
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/20">
          {!imgError ? (
            <img
              src="/images/developer.jpg"
              alt="Souvik Dash - Developer"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-teal-500/20 
                            text-teal-400 font-semibold text-lg">
              SD
            </div>
          )}
        </div>
        {/* Verified badge at bottom-right */}
        <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-white shadow-md" title="Verified Developer">
          <CheckCircle2 size={12} />
        </div>
      </motion.div>
      <div>
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          Souvik Dash
          <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-semibold">
            Verified
          </span>
        </h3>
        <p className="text-white/50 text-sm">Founder & Full-Stack Developer</p>
        <p className="text-white/30 text-xs mt-1">Building Smart Ledger X</p>
      </div>
    </motion.div>
  );
}
