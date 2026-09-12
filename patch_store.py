import sys

with open('src/context/StoreContext.tsx', 'r') as f:
    code = f.read()

# Replace the token claim check with an API call
old_mfa_check = """        if (token.claims.totp_required === true && token.claims.mfa_verified !== true) {
          setRequiresMfa(true);
          setCurrentUser(user);
          setIsAuthenticated(false);
          setIsAuthReady(true);
          return;
        } else {
          setRequiresMfa(false);
        }"""

new_mfa_check = """        // Check MFA status manually since we can't use custom claims in AI Studio environment
        try {
          const res = await fetch('/api/security/2fa/status', {
            headers: { 'Authorization': `Bearer ${token.token}` }
          });
          const status = await res.json();
          const isVerifiedLocally = sessionStorage.getItem(`mfa_verified_${user.uid}`) === 'true';
          
          if (status.enabled && !isVerifiedLocally) {
            setRequiresMfa(true);
            setCurrentUser(user);
            setIsAuthenticated(false);
            setIsAuthReady(true);
            return;
          } else {
            setRequiresMfa(false);
          }
        } catch (e) {
          console.error('[MFA Check Error]', e);
          setRequiresMfa(false);
        }"""

code = code.replace(old_mfa_check, new_mfa_check)

with open('src/context/StoreContext.tsx', 'w') as f:
    f.write(code)

print("done")
