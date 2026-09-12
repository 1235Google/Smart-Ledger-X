import sys

with open('server.ts', 'r') as f:
    code = f.read()

setup_catch = """    } catch (e: any) {
      if (e.message && e.message.startsWith('CONFIG_MISSING')) {
        return res.status(500).json({ success: false, code: 'CONFIG_MISSING', message: 'Two-factor authentication is not configured on the server.' });
      }
      res.status(500).json({ success: false, error: e.message });
    }"""

import re
code = re.sub(r"    \} catch \(e: any\) \{\n      res\.status\(500\)\.json\(\{ error: e\.message \}\);\n    \}", setup_catch, code, count=1)

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
