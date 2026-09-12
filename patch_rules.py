import sys

with open('firestore.rules', 'r') as f:
    code = f.read()

new_isSignedIn = """    function isSignedIn() {
      let isAuth = request.auth != null;
      let mfaOk = !('totp_required' in request.auth.token) || request.auth.token.totp_required != true || request.auth.token.mfa_verified == true;
      return isAuth && mfaOk;
    }"""

if "totp_required" not in code:
    code = code.replace("""    function isSignedIn() {
      return request.auth != null;
    }""", new_isSignedIn)

with open('firestore.rules', 'w') as f:
    f.write(code)

print("done")
