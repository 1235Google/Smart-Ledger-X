import React, { useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Download, Upload, Wallet, Trash2, Lock, Shield, Mail, Smartphone, Globe, User, Search, CheckCircle, Send, Loader2 } from 'lucide-react';
import { ReceivedMoney } from '../types';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';

import BiometricSettings from '../components/BiometricSettings';
import ResetDataModal from "../components/ResetDataModal";
import ChangePinModal from '../components/ChangePinModal';
import SettingsSection from '../components/settings/SettingsSection';
import SettingsItem from '../components/settings/SettingsItem';
import Switch from '../components/settings/Switch';

import IdentityCard from '../components/IdentityCard';

export default function Settings() {
  const { startingBalance, setStartingBalance, importData, securitySettings, emailSettings, updateEmailSettings, generalSettings, transactions, currentBalance, addEmailHistoryLog } = useStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [emailInput, setEmailInput] = useState(emailSettings.emailAddress || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSaveEmail = () => {
    if (!/^\S+@\S+\.\S+$/.test(emailInput)) {
      setStatusMessage("Invalid email format.");
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }
    updateEmailSettings({ ...emailSettings, emailAddress: emailInput });
    setStatusMessage('Email saved successfully');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleSendManualReport = async () => {
    if (!/^\S+@\S+\.\S+$/.test(emailInput)) {
      setStatusMessage("Invalid email format.");
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }
    setIsSending(true);
    setStatusMessage('Sending...');
    
    try {
      const now = new Date();
      const currentMonth = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: generalSettings?.timezone }).format(now);
      
      const incomeTransactions = transactions
        .filter((t): t is ReceivedMoney => t.type === 'received')
        .filter(t => {
          const txDate = new Date(t.date);
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        });

      const incomeThisMonth = incomeTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
      const numberOfIncomeTransactions = incomeTransactions.length;

      let highestPaymentReceived = null;
      if (incomeTransactions.length > 0) {
        const highestTx = [...incomeTransactions].sort((a: any, b: any) => b.amount - a.amount)[0];
        highestPaymentReceived = {
          personName: highestTx.personName,
          amount: highestTx.amount,
          dateReceived: formatDate(highestTx.date, generalSettings?.timezone)
        };
      }

      const res = await fetch('/api/send-monthly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          month: currentMonth,
          currentBalance: currentBalance,
          incomeThisMonth: incomeThisMonth,
          highestPaymentReceived: highestPaymentReceived,
          numberOfIncomeTransactions: numberOfIncomeTransactions,
        })
      });

      if (res.ok) {
        setStatusMessage(`Monthly report sent to ${emailInput} successfully!`);
        addEmailHistoryLog({
          date: new Date().toISOString(),
          month: currentMonth,
          recipient: emailInput,
          status: 'success'
        });
      } else {
        setStatusMessage('Failed to send report.');
      }
    } catch (err) {
      setStatusMessage('Error sending report.');
    } finally {
      setIsSending(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const handleExport = () => {
    const data = { isSetupComplete: true, startingBalance };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-ledger-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            </div>

            <div className="sticky top-4 z-10 mb-8">
                <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900/80 backdrop-blur-xl border border-white/5 rounded-[18px] focus-within:border-indigo-500/50 transition-all">
                    <Search className="text-slate-500" size={20}/>
                    <input type="text" placeholder="Search settings..." className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 focus:outline-none"/>
                </div>
            </div>

            {/* Sections */}
            <div className="space-y-6">
                <SettingsSection title="General" delay={0.1}>
                    <SettingsItem icon={Wallet} title="Starting Balance" description={`Current: ₹${startingBalance}`} onClick={() => { const val = prompt("Enter new starting balance:", startingBalance.toString()); if (val) setStartingBalance(Number(val)); }} />
                    <SettingsItem icon={Globe} title="Timezone" description={generalSettings?.timezone || 'Asia/Kolkata'} />
                </SettingsSection>
                
                <SettingsSection title="Security" delay={0.2}>
                    <SettingsItem icon={Lock} title="Change PIN" description="Update your security PIN" onClick={() => setShowPinSetup(true)} />
                    <SettingsItem icon={Smartphone} title="Biometric Unlock" description="Use fingerprint or face ID" action={<BiometricSettings />} />
                </SettingsSection>
                
                <SettingsSection title="Email Reports" delay={0.3}>
                    <SettingsItem icon={Mail} title="Monthly Reports" description={emailSettings.enabled ? "Enabled" : "Disabled"} action={<Switch checked={emailSettings.enabled} onChange={() => updateEmailSettings({ enabled: !emailSettings.enabled })} />} />
                    <div className="px-3 pt-2">
                      <div className="flex gap-2">
                        <input 
                          type="email" 
                          placeholder="example@gmail.com" 
                          className="flex-1 bg-neutral-800 border border-white/5 rounded-[12px] px-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                        />
                        <button 
                          onClick={handleSaveEmail}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-[12px] transition-colors"
                        >
                          Save
                        </button>
                        <button 
                          onClick={handleSendManualReport}
                          disabled={isSending}
                          className="bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-[12px] transition-colors border border-white/5 disabled:opacity-50"
                        >
                          {isSending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        </button>
                      </div>
                      {statusMessage && <p className={cn("text-[10px] mt-2 px-1", statusMessage.includes('Invalid') || statusMessage.includes('Failed') || statusMessage.includes('Error') ? "text-red-400" : "text-emerald-400")}>{statusMessage}</p>}
                    </div>
                </SettingsSection>

                <SettingsSection title="Data & Backup" delay={0.4}>
                    <SettingsItem icon={Download} title="Export Data" description="Backup your data to a file" onClick={handleExport} />
                    <SettingsItem icon={Upload} title="Import Data" description="Restore data from a file" onClick={() => fileInputRef.current?.click()} />
                    <SettingsItem icon={Trash2} title="Reset Data" description="Delete all data" variant="danger" onClick={() => setShowResetModal(true)} />
                </SettingsSection>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const json = JSON.parse(event.target?.result as string);
                            if (json && typeof json.startingBalance === 'number') {
                                if (confirm('Are you sure you want to import this data? It will overwrite your current data.')) {
                                    importData(json);
                                    alert('Data imported successfully.');
                                }
                            }
                        } catch (err) { alert('Failed to parse file.'); }
                    };
                    reader.readAsText(file);
                }
            }} />
        <ResetDataModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />
        <ChangePinModal isOpen={showPinSetup} onClose={() => setShowPinSetup(false)} />
    </div>
  );
}
