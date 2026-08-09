import React from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle2, Clock, Calendar, Send, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export default function AdminReminders() {
  const { transactions } = useStore();
  const pendingTransactions = transactions ? transactions.filter(t => t.type === 'pending' && t.status === 'pending') : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reminder Manager</h1>
          <p className="text-neutral-400 text-sm mt-1">Configure reminder frequencies, automated schedules, and dispatch notifications.</p>
        </div>
        <button 
          onClick={() => alert("Bulk reminder dispatch triggered across all channels.")}
          className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-95 transition-all flex items-center justify-center gap-2"
        >
          <Send size={18} /> Send All Reminders Now
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
        <h2 className="text-xl font-bold text-white mb-6">Active Scheduled Reminders</h2>

        <div className="space-y-4">
          {pendingTransactions.length > 0 ? (
            pendingTransactions.map((tx, idx) => (
              <div key={tx.id || idx} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-black/40 border border-white/5 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Bell size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{tx.personName}</div>
                    <div className="text-xs text-neutral-400 flex items-center gap-2 mt-1">
                      <Calendar size={14} /> Due: {(tx as any).date || 'Today'} • <Clock size={14} /> Frequency: Every 7 Days
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <div className="font-bold text-amber-400 text-lg">₹{(tx.amount || 0).toLocaleString()}</div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Scheduled</div>
                  </div>
                  <button 
                    onClick={() => alert(`Reminder dispatched successfully to ${tx.personName}!`)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg"
                  >
                    <Send size={14} /> Dispatch Now
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-neutral-500">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
              <p className="text-lg font-bold text-white">No active reminders required</p>
              <p className="text-sm mt-1">All dues have been collected successfully.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
