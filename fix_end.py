with open('server.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "const httpServer = createServer(app);" in line:
        new_lines.append("async function startServer() {\n")
        new_lines.append("  const PORT = 3000;\n")
        new_lines.append(line)
    elif "httpServer.listen(PORT" in line:
        new_lines.append("  if (process.env.VERCEL !== '1') {\n")
        new_lines.append(line)
    elif "console.log(`Server running on" in line:
        new_lines.append(line)
    elif "});" in line and "console.log(`Server running on" in lines[i-1]:
        new_lines.append(line)
        new_lines.append("  }\n")
    else:
        new_lines.append(line)

content = "".join(new_lines)
# Clean up duplicate startServer() logic at the end
content = content.replace("}\nstartServer();\nexport default app;\n", "}\nstartServer();\nexport default app;\n")

# Wait, if there was an original `async function startServer() {` and `const app = express();`, let's remove it
content = content.replace("async function startServer() {\n  const app = express();", "const app = express();\n")
content = content.replace("const PORT = 3000;\n", "") # I'll just remove the original PORT declaration and add it to startServer

with open('server.ts', 'w') as f:
    f.write(content)
