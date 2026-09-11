import sys
import re

file_path = 'server.ts'
with open(file_path, 'r') as f:
    code = f.read()

old_server_destructure = "const { email, month, transactions, customers, includePdf, aiSummary } = req.body;"
new_server_destructure = "const { email, month, transactions, customers, includePdf, aiSummary, gullakEntries } = req.body;"

old_server_call = "const result = await generateAndSendReport(email, month, transactions || [], customers || [], includePdf, aiSummary, resendApiKey);"
new_server_call = "const result = await generateAndSendReport(email, month, transactions || [], customers || [], includePdf, aiSummary, resendApiKey, gullakEntries || []);"

code = code.replace(old_server_destructure, new_server_destructure)
code = code.replace(old_server_call, new_server_call)

with open(file_path, 'w') as f:
    f.write(code)
print("Server patched")
