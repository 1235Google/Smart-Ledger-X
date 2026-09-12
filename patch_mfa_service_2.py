import sys

with open('src/server/mfa-service.ts', 'r') as f:
    code = f.read()

code = code.replace("import { TOTP } from 'otplib';\nconst authenticator = new TOTP();", "import { generateSecret, generateURI, verifySync } from 'otplib';")

code = code.replace("const secret = authenticator.generateSecret();", "const secret = generateSecret();")
code = code.replace("const uri = authenticator.keyuri(email || userId, 'SmartLedger', secret);", "const uri = generateURI({ secret, label: email || userId, issuer: 'SmartLedger' });")
code = code.replace("authenticator.check(code, secret)", "verifySync({ token: code, secret })")


with open('src/server/mfa-service.ts', 'w') as f:
    f.write(code)

print("done")
