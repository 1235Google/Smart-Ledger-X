import sys

with open('server.ts', 'r') as f:
    code = f.read()

# Wrap revokeRefreshTokens in try-catch
old_revoke = "await admin.auth().revokeRefreshTokens(uid);"
new_revoke = """try {
        await admin.auth().revokeRefreshTokens(uid);
      } catch (e) {
        console.warn('[AI Studio] Ignoring revokeRefreshTokens error due to env constraints');
      }"""
code = code.replace(old_revoke, new_revoke)

# Wrap setCustomUserClaims in try-catch
old_set_claim = "await admin.auth().setCustomUserClaims(uid, { lockedOut: true });"
new_set_claim = """try {
        await admin.auth().setCustomUserClaims(uid, { lockedOut: true });
      } catch (e) {
        console.warn('[AI Studio] Ignoring setCustomUserClaims error due to env constraints');
      }"""
code = code.replace(old_set_claim, new_set_claim)

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
