import sys

with open('src/components/TotpSetupModal.tsx', 'r') as f:
    code = f.read()

# Replace the fetch logic
old_fetch = """      const res = await fetch('/api/security/2fa/setup', {
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
        throw new Error('Server returned an invalid response from the 2FA setup endpoint. Response was: ' + text.substring(0, 100));
      }"""

new_fetch = """      let res;
      let retries = 3;
      while (retries > 0) {
        res = await fetch('/api/security/2fa/setup', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 502 || res.status === 504 || res.status === 503) {
          retries--;
          if (retries === 0) throw new Error('Server is currently restarting or unavailable. Please try again in a few seconds.');
          await new Promise(r => setTimeout(r, 2000));
        } else {
          break;
        }
      }
      
      if (!res) throw new Error('Failed to connect to server.');
      
      const text = await res.text();
      if (!text) {
        throw new Error('Server returned an empty response from the 2FA setup endpoint.');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
          throw new Error('Server returned an HTML page (likely starting up). Please wait a moment and try again.');
        }
        throw new Error('Server returned an invalid response: ' + text.substring(0, 100));
      }"""

code = code.replace(old_fetch, new_fetch)

with open('src/components/TotpSetupModal.tsx', 'w') as f:
    f.write(code)

print("done")
