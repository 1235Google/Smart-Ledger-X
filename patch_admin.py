import sys

with open('src/server/firebase-admin.ts', 'r') as f:
    code = f.read()

replacement = """import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const anyAdmin: any = admin;
anyAdmin.auth = getAuth;
anyAdmin.firestore = getFirestore;
anyAdmin.firestore.FieldValue = FieldValue;
export { anyAdmin as admin };"""

code = code.replace("const anyAdmin: any = admin;\nexport { anyAdmin as admin };", replacement)

with open('src/server/firebase-admin.ts', 'w') as f:
    f.write(code)

print("done")
