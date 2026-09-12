import sys

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

disable_logic = """                     onClick={async () => {
                        const code = window.prompt("To disable 2FA, please enter a valid authenticator code:");
                        if (!code) return;
                        setIsProcessing(true);
                        try {
                           const token = await auth.currentUser?.getIdToken();
                           const res = await fetch('/api/security/2fa/disable', {
                             method: 'POST',
                             headers: {
                               'Content-Type': 'application/json',
                               'Authorization': `Bearer ${token}`
                             },
                             body: JSON.stringify({ code })
                           });
                           const data = await res.json();
                           if (data.success) {
                             setIsMfaEnabled(false);
                             alert("Two-Factor Authentication disabled.");
                           } else {
                             alert("Failed to disable 2FA: " + (data.error || 'Invalid code'));
                           }
                        } catch (err: any) {
                           alert("Error disabling 2FA: " + err.message);
                        } finally {
                           setIsProcessing(false);
                        }
                     }}"""
code = code.replace("""                     onClick={() => {
                        if (window.confirm("Are you sure you want to disable 2FA? This is not recommended.")) {
                           alert("To disable 2FA, please verify your identity.");
                        }
                     }}""", disable_logic)

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
