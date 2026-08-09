import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalAmount, setNewGoalAmount] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('smartledger_manual_goals');
    if (saved) {
      try { setGoals(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const saveGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    localStorage.setItem('smartledger_manual_goals', JSON.stringify(newGoals));
  };

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalName || !newGoalAmount) return;
    const goal: Goal = {
      id: Date.now().toString(),
      name: newGoalName,
      targetAmount: Number(newGoalAmount),
      currentAmount: 0
    };
    saveGoals([...goals, goal]);
    setNewGoalName('');
    setNewGoalAmount('');
  };

  const deleteGoal = (id: string) => {
    saveGoals(goals.filter(g => g.id !== id));
  };

  const updateProgress = (id: string, amount: number) => {
    saveGoals(goals.map(g => {
      if (g.id === id) {
        return { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) };
      }
      return g;
    }));
  };

  return (
    <div className="w-full space-y-8">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-indigo-400">
            <Target size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Goal Tracker</h1>
        </div>
        <p className="text-slate-400">Manually set and track your financial goals.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-[#0a0b10] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Plus size={20} className="text-indigo-400" />
              Add a New Goal
            </h2>
            
            <form onSubmit={addGoal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Goal Name</label>
                <input
                  type="text"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors text-sm"
                  placeholder="e.g. New Car, Dream Vacation"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-400">Target Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                  <input
                    type="number"
                    value={newGoalAmount}
                    onChange={(e) => setNewGoalAmount(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl min-h-[48px] pl-8 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors text-sm"
                    placeholder="50000"
                    required
                    min="1"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!newGoalName || !newGoalAmount}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold min-h-[48px] rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-600/30"
              >
                <Plus size={18} />
                Add Goal
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Your Goals</h2>
          {goals.length === 0 ? (
            <div className="bg-[#0a0b10] border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-400 mb-4">
                <Target size={32} />
              </div>
              <p className="text-slate-300 font-medium">No goals yet</p>
              <p className="text-sm text-slate-500 mt-2">Create your first goal to start tracking.</p>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0a0b10] border border-white/5 rounded-2xl p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-white text-lg">{goal.name}</h3>
                      <p className="text-sm text-slate-400 mt-1">Target: {formatCurrency(goal.targetAmount)}</p>
                    </div>
                    <button onClick={() => deleteGoal(goal.id)} className="text-slate-500 hover:text-red-400 transition-colors p-2">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-400 font-medium">{formatCurrency(goal.currentAmount)}</span>
                      <span className="text-slate-400">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex gap-2">
                    <button onClick={() => updateProgress(goal.id, 1000)} className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
                      + ₹1,000
                    </button>
                    <button onClick={() => updateProgress(goal.id, 5000)} className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
                      + ₹5,000
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
