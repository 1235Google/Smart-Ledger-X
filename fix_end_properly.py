with open('server.ts', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "app.use((req, res) => {" in line:
        start_idx = i
        break

# Truncate and rewrite from start_idx
new_lines = lines[:start_idx]
new_lines.extend([
    "    app.use((req, res) => {\n",
    "      res.sendFile(path.join(distPath, 'index.html'));\n",
    "    });\n",
    "  }\n", # closes else
    "\n",
    "  if (process.env.VERCEL !== '1') {\n",
    "    httpServer.listen(PORT, \"0.0.0.0\", () => {\n",
    "      console.log(`Server running on http://localhost:${PORT}`);\n",
    "    });\n",
    "  }\n", # closes if
    "\n",
    "export default app;\n"
])

with open('server.ts', 'w') as f:
    f.writelines(new_lines)
