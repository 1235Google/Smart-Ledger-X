import sys

with open('src/components/TotpSetupModal.tsx', 'r') as f:
    code = f.read()

code = code.replace("createNotification(", "createNotification({ title: ")
code = code.replace("'Your account is now protected with TOTP.',", "message: 'Your account is now protected with TOTP.', type: 'success', category: ")
code = code.replace("'security'\n      )", "'security'\n      })")

with open('src/components/TotpSetupModal.tsx', 'w') as f:
    f.write(code)

print("done")
