import sys
import re

with open('server.ts', 'r') as f:
    code = f.read()

vite_middleware_regex = re.compile(r"  // Vite middleware for development.*?  }\n", re.DOTALL)
match = vite_middleware_regex.search(code)
if match:
    middleware_code = match.group(0)
    # Remove from current location
    code = code.replace(middleware_code, "")
    
    # Insert before http.createServer or httpServer.listen
    # Wait, http.createServer(app) is just after the middleware currently.
    # It's better to insert the middleware right before httpServer.listen
    listen_regex = r"  httpServer\.listen\(PORT, \"0\.0\.0\.0\", \(\) => {"
    
    code = re.sub(listen_regex, middleware_code + "\n" + listen_regex, code)

with open('server.ts', 'w') as f:
    f.write(code)

print("done")
