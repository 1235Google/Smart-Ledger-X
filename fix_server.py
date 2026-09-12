import re

with open('server.ts', 'r') as f:
    code = f.read()

# 1. Remove `async function startServer() {` and `const app = express();`
code = code.replace("async function startServer() {\n  const app = express();", "const app = express();")

# 2. Put startServer around the httpServer part
# Find where httpServer is created
http_server_start = code.find('const httpServer = createServer(app);')

if http_server_start != -1:
    before = code[:http_server_start]
    after = code[http_server_start:]
    
    # We need to find the end of startServer() block
    # It was closed at the very end before export default app;
    
    code = before + "\nasync function startServer() {\n  " + after
    
    # Now fix the end. Replace the last `}\nstartServer();`
    code = code.replace("}\nstartServer();\n\nexport default app;", "}\nstartServer();\n\nexport default app;")
    # Wait, the original code had:
    # }
    # startServer();
    # export default app;
    # (Because I added export default app;)
    
    # Let's just do a simple string replacement for the end.
    
    # Actually, the original file had `startServer();` at the end.
    # Let's find it.
    code = code.replace("}\nstartServer();\nexport default app;", "}\nstartServer();\n\nexport default app;")

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
