const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Find the bad block and replace it
const badBlock = `  if (process.env.VERCEL !== '1') {
  if (process.env.VERCEL !== '1') {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on http://localhost:\${PORT}\`);
    });
  }
  }
}`;
const goodBlock = `  if (process.env.VERCEL !== '1') {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on http://localhost:\${PORT}\`);
    });
  }
}`;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('server.ts', code);
