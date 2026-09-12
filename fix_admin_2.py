import sys

with open('src/server/firebase-admin.ts', 'r') as f:
    code = f.read()

# Change it back to require so it's commonjs compatible if ES modules give issues with apps property
code = code.replace("import admin from 'firebase-admin';", "import * as admin from 'firebase-admin';")

with open('src/server/firebase-admin.ts', 'w') as f:
    f.write(code)

print("done")
