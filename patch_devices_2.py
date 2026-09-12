import sys

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

# Remove createNotification from useStore
code = code.replace("const { currentUser, securitySettings, updateSecuritySettings, createNotification, logout } = useStore();",
                    "const { currentUser, securitySettings, updateSecuritySettings, logout } = useStore();")
                    
# Fix location strings
code = code.replace("device.location?.city", "device.city")
code = code.replace("device.location.city", "device.city")
code = code.replace("device.location.country", "device.country")

code = code.replace("log.location?.city", "log.city")
code = code.replace("log.location?.country", "log.country")
code = code.replace("log.device", "log.deviceName")
code = code.replace("log.status === 'success'", "log.status === 'Success'")
code = code.replace("authorizationResult: 'SUCCESS'", "authorizationResult: 'user'")

with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

with open('server.ts', 'r') as f:
    server_code = f.read()
server_code = server_code.replace("authorizationResult: 'SUCCESS'", "authorizationResult: 'user'")
with open('server.ts', 'w') as f:
    f.write(server_code)

print("done")
