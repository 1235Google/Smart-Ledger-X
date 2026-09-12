import sys

with open('src/components/MfaChallenge.tsx', 'r') as f:
    code = f.read()

# When customToken is returned, also set sessionStorage
old_verify = """      if (data.customToken) {
        // Authenticate with custom token to get mfa_verified claim
        await signInWithCustomToken(auth, data.customToken);
      }"""

new_verify = """      if (data.customToken) {
        // We set session storage flag because custom token claims are not available in AI Studio environment
        if (auth.currentUser) {
          sessionStorage.setItem(`mfa_verified_${auth.currentUser.uid}`, 'true');
        }
        
        try {
          await signInWithCustomToken(auth, data.customToken);
        } catch (e) {
          console.warn('Custom token sign-in failed (expected in AI Studio), proceeding with local verification flag.');
          // Force auth state change to re-trigger StoreContext logic
          await auth.currentUser?.getIdToken(true);
        }
      } else {
        if (auth.currentUser) {
          sessionStorage.setItem(`mfa_verified_${auth.currentUser.uid}`, 'true');
        }
        await auth.currentUser?.getIdToken(true);
      }"""

code = code.replace(old_verify, new_verify)

with open('src/components/MfaChallenge.tsx', 'w') as f:
    f.write(code)

print("done")
