import sys

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

old_ui = """<div className="bg-[#1a1b23] border border-white/10 rounded-3xl p-6">
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
            </div>"""

new_ui = """<div className="bg-[#1a1b23] border border-white/10 rounded-3xl p-6">
               <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide text-xs text-slate-400">Two-Factor Authentication</h3>
               
               {!isMfaEnabled ? (
                 <>
                   <p className="text-slate-400 text-sm mb-4">Not configured</p>
                   <button
                      onClick={() => setShowTotpModal(true)}
                     className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all uppercase tracking-wider text-sm"
                   >
                      SETUP 2FA
                   </button>
                 </>
               ) : (
                 <>
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                     <span className="text-emerald-400 font-bold tracking-widest uppercase text-sm">ENABLED</span>
                   </div>
                   <p className="text-white font-medium mb-1">Authenticator App</p>
                   <p className="text-slate-400 text-sm mb-4">Protected with TOTP</p>
                   <button
                     onClick={() => {
                        if (window.confirm("Are you sure you want to disable 2FA? This is not recommended.")) {
                           alert("To disable 2FA, please verify your identity.");
                        }
                     }}
                     className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all uppercase tracking-wider text-sm"
                   >
                     MANAGE 2FA
                   </button>
                 </>
               )}
            </div>"""
if "Setup Two-Factor Authentication" in code:
    code = code.replace(old_ui, new_ui)

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
