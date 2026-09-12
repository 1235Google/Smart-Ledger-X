const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Wrap the top-level vite init in an IIFE
const badBlock = `  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }`;

const goodBlock = `  if (process.env.NODE_ENV !== "production") {
    (async () => {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    })();
  }`;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('server.ts', code);
