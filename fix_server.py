import sys

with open('server.ts', 'r') as f:
    code = f.read()

code = code.replace("authorizationResult: 'SUCCESS',", "authorizationResult: 'user',")

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
