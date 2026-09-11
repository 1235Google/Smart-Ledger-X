import sys
import re

file_path = 'src/lib/reportsExportEngine.ts'
with open(file_path, 'r') as f:
    code = f.read()

code = code.replace("applyPremiumFooter, premiumTableStyles }", "applyPremiumFooter, drawSummaryGrid, premiumTableStyles }")

with open(file_path, 'w') as f:
    f.write(code)
print("done")
