import sys

with open('src/components/TotpSetupModal.tsx', 'r') as f:
    code = f.read()

setup_replacement = """  const startEnrollment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/security/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const text = await res.text();
      if (!text) {
        throw new Error('Server returned an empty response from the 2FA setup endpoint.');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server returned an invalid response from the 2FA setup endpoint.');
      }
      
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to start setup');
      }
      
      setSecret(data.secret || data.manualEntryKey);
      setQrCodeUrl(data.qrCodeUrl || data.qrCodeDataUrl);
    } catch (err: any) {
      console.error('[2FA Setup Error]:', err);
      setError(err.message);
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };"""

if "const text = await res.text();" not in code:
    import re
    code = re.sub(r"  const startEnrollment = async \(\) => \{.*?\n  \};\n", setup_replacement + "\n", code, flags=re.DOTALL)

with open('src/components/TotpSetupModal.tsx', 'w') as f:
    f.write(code)

print("done")
