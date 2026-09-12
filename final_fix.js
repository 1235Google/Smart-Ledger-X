const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Insert async function startServer() { before const httpServer = http.createServer(app);
code = code.replace(/  const httpServer = http.createServer\(app\);/g, 'async function startServer() {\n  const PORT = 3000;\n  const httpServer = http.createServer(app);');

fs.writeFileSync('server.ts', code);
console.log('done');
