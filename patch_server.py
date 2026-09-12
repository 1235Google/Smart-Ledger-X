import sys

with open('server.ts', 'r') as f:
    code = f.read()

# 1. Remove static import of vite
code = code.replace('import { createServer as createViteServer } from "vite";\n', '')

# 2. Fix the dynamic import of vite
old_vite = """    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);"""
new_vite = """    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);"""
code = code.replace(old_vite, new_vite)

# 3. Prevent listening on Vercel
old_listen = """  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });"""
new_listen = """  if (process.env.VERCEL !== '1') {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }"""
code = code.replace(old_listen, new_listen)

# 4. Export app
if "export default app;" not in code:
    code += "\nexport default app;\n"

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
