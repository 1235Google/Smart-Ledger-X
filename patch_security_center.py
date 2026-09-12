import sys

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

import_statement = "import TotpSetupModal from '../components/TotpSetupModal';\n"
if "import TotpSetupModal" not in code:
    code = code.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\n" + import_statement)

import_auth = "import { auth } from '../lib/firebase';\n"
if "import { auth }" not in code:
    code = code.replace("import { useStore } from '../context/StoreContext';", "import { useStore } from '../context/StoreContext';\n" + import_auth)

state_additions = """
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [showTotpModal, setShowTotpModal] = useState(false);

  useEffect(() => {
    const fetchMfaStatus = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/security/2fa/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && typeof data.enabled === 'boolean') {
          setIsMfaEnabled(data.enabled);
        }
      } catch (err) {
        console.error("Failed to fetch MFA status:", err);
      }
    };
    fetchMfaStatus();
  }, [showTotpModal]);
"""
if "isMfaEnabled" not in code:
    code = code.replace("  const [isProcessing, setIsProcessing] = useState(false);", state_additions)

old_2fa_ui = """<div className="bg-[#1a1b23] border border-white/10 rounded-3xl p-6 opacity-60">
               <h3 className="text-lg font-bold text-white mb-2">Two-Factor Authentication (TOTP)</h3>
               <p className="text-slate-400 text-sm mb-4">Use an authenticator app like Google Authenticator.</p>
               <button disabled className="px-4 py-2 bg-white/5 text-slate-500 font-bold rounded-xl cursor-not-allowed">
                  Setup 2FA (Requires Identity Platform)
               </button>
            </div>"""

new_2fa_ui = """<div className="bg-[#1a1b23] border border-white/10 rounded-3xl p-6">
               <h3 className="text-lg font-bold text-white mb-2">Two-Factor Authentication (TOTP)</h3>
               <p className="text-slate-400 text-sm mb-4">Use an authenticator app like Google Authenticator.</p>
               
               {!isMfaEnabled ? (
                 <button
                    onClick={() => setShowTotpModal(true)}
                   className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
                 >
                    Setup Two-Factor Authentication
                 </button>
               ) : (
                 <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 text-emerald-400 font-bold">
                     <CheckCircle2 size={18} /> Enabled
                   </div>
                   <button
                     onClick={() => {
                        if (window.confirm("Are you sure you want to disable 2FA? This is not recommended.")) {
                           // Disable logic here in the future
                           alert("To disable 2FA, please verify your identity.");
                        }
                     }}
                     className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-all"
                   >
                     Manage 2FA
                   </button>
                 </div>
               )}
            </div>
            
            <AnimatePresence>
              {showTotpModal && (
                <TotpSetupModal 
                  onClose={() => setShowTotpModal(false)}
                  onComplete={() => {
                    setShowTotpModal(false);
                    setIsMfaEnabled(true);
                  }}
                />
              )}
            </AnimatePresence>"""
if "Setup Two-Factor Authentication" not in code:
    code = code.replace(old_2fa_ui, new_2fa_ui)

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
