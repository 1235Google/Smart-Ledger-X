const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove the original async function startServer() {
code = code.replace(/async function startServer\(\) \{\s*const app = express\(\);\s*const PORT = 3000;/g, 'const app = express();');

// 2. Wrap httpServer = createServer(app) to the end in startServer()
code = code.replace(/const httpServer = createServer\(app\);/g, 'async function startServer() {\nconst PORT = 3000;\nconst httpServer = createServer(app);');

// 3. Wrap httpServer.listen in VERCEL check
const listenBlock = `httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });`;
const newListenBlock = `if (process.env.VERCEL !== '1') {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on http://localhost:\${PORT}\`);
    });
  }`;
code = code.replace(listenBlock, newListenBlock);

// 4. Make sure export default app; is at the end
code = code.replace(/export default app;/g, '');
code += '\nexport default app;\n';

fs.writeFileSync('server.ts', code);
console.log('done');
