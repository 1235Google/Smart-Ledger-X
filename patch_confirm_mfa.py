import sys

with open('src/server/mfa-service.ts', 'r') as f:
    code = f.read()

code = code.replace("if (!isValid) return { success: false, error: 'Invalid authenticator code' };", 
                    "if (!isValid) return { success: false, code: 'INVALID_CODE', message: 'Invalid or expired authentication code.' };")

with open('src/server/mfa-service.ts', 'w') as f:
    f.write(code)

print("done")
