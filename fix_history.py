import sys

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

code = code.replace("{log.device} • {log.browser}", "{log.deviceName} • {log.browser}")
code = code.replace("{log.location?.city}, {log.location?.country}", "{log.city || log.location}, {log.country}")
code = code.replace("log.status === 'success'", "log.status === 'Success'")

# Also fix the initial setup in device map for getDeviceIcon(device.deviceType || '') because deviceType isn't a string maybe? No, it is 'desktop' | 'mobile' | 'tablet'.

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
