import sys

with open('src/server/mfa-service.ts', 'r') as f:
    code = f.read()

# Replace the fallback key logic with an explicit check
old_key_logic = """const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || crypto.createHash('sha256').update('smart-ledger-default-dev-key').digest('base64').substring(0, 32);"""

new_key_logic = """function getEncryptionKey() {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('CONFIG_MISSING: Two-factor authentication is not configured on the server.');
  }
  return key.substring(0, 32);
}"""

code = code.replace(old_key_logic, new_key_logic)
code = code.replace("Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32))", "Buffer.from(getEncryptionKey())")

with open('src/server/mfa-service.ts', 'w') as f:
    f.write(code)

print("done")
