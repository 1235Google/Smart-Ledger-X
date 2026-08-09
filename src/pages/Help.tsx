import React, { useState } from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  Mail, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Zap, 
  Lock, 
  Wallet, 
  FileText, 
  ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'security' | 'ledger' | 'reports';
}

const faqs: FAQItem[] = [
  {
    id: '1',
    category: 'general',
    question: 'What is SmartLedger and how does it work?',
    answer: 'SmartLedger is a modern financial tracking and ledger app that allows you to record received income, sent expenses, pending payments with automated reminders, and Gullak savings goals with real-time cloud synchronization.'
  },
  {
    id: '2',
    category: 'ledger',
    question: 'How do I track pending payments and send reminders?',
    answer: 'Navigate to Pending Payments from the sidebar. Add a new pending entry specifying the customer, amount, and due date. You can click "Send Reminder" to send WhatsApp or Email reminders to the recipient.'
  },
  {
    id: '3',
    category: 'security',
    question: 'How secure is my financial data?',
    answer: 'Your data is encrypted using AES-256 standard encryption before sync and backed up safely in Google Firebase Firestore. You can enable PIN lock and Biometric security from Settings -> Security.'
  },
  {
    id: '4',
    category: 'reports',
    question: 'Can I export my transaction history to Excel or PDF?',
    answer: 'Yes! Go to Import & Export or Monthly Reports to generate and download comprehensive XLSX spreadsheets or formatted PDF reports at any time.'
  },
  {
    id: '5',
    category: 'general',
    question: 'What is the Gullak Savings feature?',
    answer: 'Gullak is a digital piggy bank feature that helps you set monthly savings targets, track small daily/weekly contributions, and celebrate milestones with animated achievements.'
  }
];

export default function Help() {
  const [openFaq, setOpenFaq] = useState<string | null>('1');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'security' | 'ledger' | 'reports'>('all');

  const filteredFaqs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(f => f.category === selectedCategory);

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <HelpCircle size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Help & Support</h1>
            <p className="text-slate-400 text-sm mt-0.5">Find answers to common questions or reach out to our team</p>
          </div>
        </div>
      </header>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Documentation</h3>
              <p className="text-xs text-slate-400">Guides & Tutorials</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Learn how to use all SmartLedger features including Gullak, Reminders, and Analytics.
          </p>
          <a
            href="#faq-section"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <span>Read Knowledge Base</span>
            <ChevronDown size={14} />
          </a>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">WhatsApp Support</h3>
              <p className="text-xs text-slate-400">Instant Help</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Need urgent assistance with transactions or account management? Message our support team.
          </p>
          <a
            href="https://wa.me/?text=Hello%20SmartLedger%20Support"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <span>Chat on WhatsApp</span>
            <ExternalLink size={14} />
          </a>
        </div>

        <div className="bg-neutral-900/60 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Email Support</h3>
              <p className="text-xs text-slate-400">Official Help Desk</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Send us an email regarding technical queries, billing, or security questions.
          </p>
          <a
            href="mailto:support@smartledger.app"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300"
          >
            <span>support@smartledger.app</span>
            <Mail size={14} />
          </a>
        </div>
      </div>

      {/* FAQ Section */}
      <section id="faq-section" className="bg-neutral-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400 mt-1">Everything you need to know about SmartLedger</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'general', 'security', 'ledger', 'reports'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-neutral-900/80 border border-white/5 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-semibold text-white text-sm sm:text-base pr-4">{faq.question}</span>
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 flex-shrink-0">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 pt-0 border-t border-white/5 text-xs sm:text-sm text-slate-300 leading-relaxed bg-white/[0.01]">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
