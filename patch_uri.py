import sys

with open('src/server/mfa-service.ts', 'r') as f:
    code = f.read()

code = code.replace("const uri = generateURI({ secret, label, issuer });", "const uri = generateURI({ secret, label, issuer }) + '&algorithm=SHA1&digits=6&period=30';")

with open('src/server/mfa-service.ts', 'w') as f:
    f.write(code)

print("done")
