import sys
import re

with open('src/pages/SecurityCenter.tsx', 'r') as f:
    code = f.read()

# 1. Remove createNotification from useStore
code = code.replace("const { currentUser, securitySettings, updateSecuritySettings, createNotification, logout } = useStore();",
                    "const { currentUser, securitySettings, updateSecuritySettings, logout } = useStore();")

# 2. Add import for createNotification
if "createNotification" in code and "notificationService" not in code:
    code = code.replace("import { format } from 'date-fns';", "import { format } from 'date-fns';\nimport { createNotification } from '../lib/notificationService';")

# 3. Fix location types
code = code.replace("const exactLocation = {", "const exactLocationStr = `${data.city}, ${data.country_name}`;\n        const exactLocation = {")
code = code.replace("location: exactLocation, ip: newIp", "location: exactLocationStr, city: data.city, country: data.country_name, region: data.region, ip: newIp")

# Also need to fix device.location?.city in rendering, because device.location is a string. Wait, earlier device.location was an object in the JSON or the type is wrong. Let's see:
code = code.replace("device.location?.city", "device.city")
code = code.replace("device.location.city", "device.city")
code = code.replace("device.location.country", "device.country")

# Also there's an error on line 531: Property 'device' does not exist on type 'LoginHistoryEntry'
# Let's check LoginHistoryEntry.
with open('src/pages/SecurityCenter.tsx', 'w') as f:
    f.write(code)

print("done")
