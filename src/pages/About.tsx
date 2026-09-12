import React from 'react';
import { Wallet, Sparkles, User, Code, Briefcase, Calendar, Mail, CheckCircle2 } from 'lucide-react';

export default function About() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="w-full space-y-8 max-w-4xl mx-auto pb-10">
      {/* Hero Banner - About Smart Ledger */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-950/60 via-neutral-900 to-black p-6 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 relative z-10 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 border border-white/20 flex-shrink-0">
            <Wallet size={32} className="text-white sm:w-10 sm:h-10" />
          </div>
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles size={14} />
              <span>Smart Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">About Smart Ledger</h1>
            <div className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed space-y-3">
              <p>
                Smart Ledger is a simple and easy-to-use digital ledger application designed to help users manage transactions, income, expenses, balances, and financial records in one place.
              </p>
              <p>
                Smart Ledger was created to make everyday financial management simple, organized, and easy to understand.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Information Card */}
      <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="text-indigo-400" />
            Developer Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Souvik Dash is the creator and Full-Stack Developer of Smart Ledger. With 2+ years of development experience, he focuses on building simple, useful, and user-friendly digital solutions.
              </p>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Smart Ledger was designed and developed by Souvik Dash with a focus on simplicity, performance, and a smooth user experience.
              </p>
            </div>
            
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-white font-bold text-sm tracking-widest uppercase text-indigo-400/80 mb-4">Developer Details</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-200">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <User size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Name</span>
                    <span className="text-sm font-medium text-white">Souvik Dash</span>
                  </div>
                </li>
                <li className="flex items-center gap-3 text-slate-200">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                    <Code size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Role</span>
                    <span className="text-sm font-medium text-white">Creator & Full-Stack Developer</span>
                  </div>
                </li>
                <li className="flex items-center gap-3 text-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Experience</span>
                    <span className="text-sm font-medium text-white">2+ Years</span>
                  </div>
                </li>
                <li className="flex items-center gap-3 text-slate-200">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                    <Mail size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Email</span>
                    <a href="mailto:souvikbbsr811@gmail.com" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                      souvikbbsr811@gmail.com
                    </a>
                  </div>
                </li>
                <li className="flex items-center gap-3 text-slate-200">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Project</span>
                    <span className="text-sm font-medium text-white">Smart Ledger</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Specifications */}
      <div className="bg-neutral-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Code className="text-slate-400" size={20} />
          Technology Stack
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Frontend Framework</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1.5"><CheckCircle2 size={14} className="text-indigo-400"/> React 18 + Vite</span>
          </div>
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Styling</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1.5"><CheckCircle2 size={14} className="text-indigo-400"/> Tailwind CSS</span>
          </div>
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Database & Sync</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1.5"><CheckCircle2 size={14} className="text-indigo-400"/> Firebase Firestore</span>
          </div>
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Authentication</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1.5"><CheckCircle2 size={14} className="text-indigo-400"/> Firebase Auth</span>
          </div>
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Animations</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1.5"><CheckCircle2 size={14} className="text-indigo-400"/> Framer Motion</span>
          </div>
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Data Visualization</span>
            <span className="text-sm font-semibold text-white flex items-center gap-1.5"><CheckCircle2 size={14} className="text-indigo-400"/> Recharts</span>
          </div>
        </div>
      </div>

      {/* Footer / Credit */}
      <div className="text-center text-sm text-slate-400 pt-6 pb-4 space-y-2 border-t border-white/10">
        <p className="font-medium text-slate-300">Designed & Developed by Souvik Dash</p>
        <p className="text-xs">© {currentYear} Smart Ledger. All rights reserved.</p>
      </div>
    </div>
  );
}
