import sys

with open('src/components/TotpSetupModal.tsx', 'r') as f:
    code = f.read()

code = code.replace("throw new Error('Server returned an invalid response from the 2FA setup endpoint.');", "throw new Error('Server returned an invalid response from the 2FA setup endpoint. Response was: ' + text.substring(0, 100));")

with open('src/components/TotpSetupModal.tsx', 'w') as f:
    f.write(code)

print("done")
