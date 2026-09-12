const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace("}\nstartServer();\nexport default app;", "export default app;");
code = code.replace("}\n\nstartServer();\nexport default app;", "export default app;");
fs.writeFileSync('server.ts', code);
