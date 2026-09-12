with open('server.ts', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "res.status(500).json({ error: e.message });" in line and "});" in lines[i+1]:
        lines.insert(i+1, "    }\n")

with open('server.ts', 'w') as f:
    f.writelines(lines)
