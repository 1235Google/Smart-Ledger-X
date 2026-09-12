with open('server.ts', 'r') as f:
    code = f.read()

code = code.replace("  if (process.env.VERCEL !== '1') {\n    httpServer.listen(PORT", "  const PORT = 3000;\n  if (process.env.VERCEL !== '1') {\n    httpServer.listen(PORT")

with open('server.ts', 'w') as f:
    f.write(code)
