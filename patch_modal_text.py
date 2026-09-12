import sys

with open('src/components/TotpSetupModal.tsx', 'r') as f:
    code = f.read()

code = code.replace("Scan with your authenticator app", "Scan this QR code with Google Authenticator")
code = code.replace("Can't scan? Use setup key", "Can't scan? Enter this setup key manually")

with open('src/components/TotpSetupModal.tsx', 'w') as f:
    f.write(code)

print("done")
