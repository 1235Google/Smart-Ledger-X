import sys

with open('src/components/TotpSetupModal.tsx', 'r') as f:
    code = f.read()

confirm_replacement = """  const handleVerify = async () => {
    if (code.length < 6) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/security/2fa/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      
      const text = await res.text();
      if (!text) {
        throw new Error('Server returned an empty response from the 2FA confirm endpoint.');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server returned an invalid response from the 2FA confirm endpoint.');
      }
      
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Invalid code');
      }
      
      setRecoveryCodes(data.recoveryCodes);
      setStep(4);
      createNotification({ title: 
        'Two-Factor Authentication Enabled',
        message: 'Your account is now protected with TOTP.', type: 'success', category: 
        'security'
      });
    } catch (err: any) {
      console.error('[2FA Confirm Error]:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };"""

if "const text = await res.text();" not in code.split("handleVerify")[1]:
    import re
    code = re.sub(r"  const handleVerify = async \(\) => \{.*?\n  \};\n", confirm_replacement + "\n", code, flags=re.DOTALL)

with open('src/components/TotpSetupModal.tsx', 'w') as f:
    f.write(code)

print("done")
