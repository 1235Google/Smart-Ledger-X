import sys
import re

with open('server.ts', 'r') as f:
    code = f.read()

# Make sure all mfa calls pass idToken
code = code.replace("confirmMfa(decodedToken.uid, code)", "confirmMfa(decodedToken.uid, code, idToken)")
code = code.replace("verifyMfa(decodedToken.uid, code)", "verifyMfa(decodedToken.uid, code, idToken)")
code = code.replace("disableMfa(decodedToken.uid, code)", "disableMfa(decodedToken.uid, code, idToken)")
code = code.replace("checkMfaStatus(decodedToken.uid)", "checkMfaStatus(decodedToken.uid, idToken)")

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
