import re

with open('server.ts', 'r') as f:
    code = f.read()

# Replace the specific vite import block
code = re.sub(
    r'const \{ createServer: createViteServer \} = await import\("vite"\);\s*const vite = await createViteServer\(\{\s*server: \{ middlewareMode: true \},\s*appType: "spa",\s*\}\);\s*app.use\(vite.middlewares\);',
    r'(async () => { const { createServer: createViteServer } = await import("vite"); const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa", }); app.use(vite.middlewares); })();',
    code
)

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
