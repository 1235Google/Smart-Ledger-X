import sys

with open('src/components/TotpSetupModal.tsx', 'r') as f:
    code = f.read()

import re

# We need to add state for showSecret
state_match = re.search(r"const \[savedCodes, setSavedCodes\] = useState\(false\);", code)
if state_match and "showSecret" not in code:
    code = code.replace(state_match.group(0), state_match.group(0) + "\n  const [showSecret, setShowSecret] = useState(false);")

old_key_ui = """<div className="flex items-center gap-2">
                        <code className="flex-1 bg-black/40 py-2 px-3 rounded-lg text-emerald-400 font-mono text-center tracking-widest text-sm select-all">
                          {secret}
                        </code>
                        <button onClick={copySecret} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors">
                          {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>"""

new_key_ui = """<div className="flex flex-col gap-2">
                        {showSecret ? (
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-black/40 py-2 px-3 rounded-lg text-emerald-400 font-mono text-center tracking-widest text-sm select-all">
                              {secret}
                            </code>
                            <button onClick={copySecret} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              Copy Setup Key
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setShowSecret(true)} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-all text-sm">
                            Show Setup Key
                          </button>
                        )}
                      </div>"""

code = code.replace(old_key_ui, new_key_ui)

with open('src/components/TotpSetupModal.tsx', 'w') as f:
    f.write(code)

print("done")
