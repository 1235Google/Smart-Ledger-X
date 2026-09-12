import sys

with open('server.ts', 'r') as f:
    lines = f.readlines()

# Remove the lines starting with } and startServer(); at the end
# We'll just read from the end and strip them out.
new_lines = []
for line in lines:
    if line.strip() == "}" and len(new_lines) > 1800:
        continue
    if "startServer();" in line:
        continue
    new_lines.append(line)

with open('server.ts', 'w') as f:
    f.writelines(new_lines)
