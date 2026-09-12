import sys

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

if "import { createNotification }" not in code:
    code = code.replace("import { format } from 'date-fns';", "import { format } from 'date-fns';\nimport { createNotification } from '../lib/notificationService';")

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
