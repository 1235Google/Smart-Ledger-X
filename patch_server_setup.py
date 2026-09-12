import sys

with open('server.ts', 'r') as f:
    code = f.read()

code = code.replace("const { secret, qrCodeUrl } = await setupMfa(decodedToken.uid, email);\n      res.json({ secret, qrCodeUrl });", "const setupData = await setupMfa(decodedToken.uid, email);\n      res.json(setupData);")

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
