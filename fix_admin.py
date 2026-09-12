import sys

with open('src/server/firebase-admin.ts', 'r') as f:
    code = f.read()

code = code.replace("import * as admin from 'firebase-admin';", "import admin from 'firebase-admin';")

with open('src/server/firebase-admin.ts', 'w') as f:
    f.write(code)

print("done")
