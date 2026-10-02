const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolveAsset(distDir, requestUrl) {
  const rawPath = decodeURIComponent(String(requestUrl || "/").split("?")[0]);
  const relative = rawPath === "/" ? "index.html" : rawPath.replace(/^\/+/, "");
  const resolved = path.resolve(distDir, relative);
  if (!resolved.startsWith(path.resolve(distDir))) return null;
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  return path.join(distDir, "index.html");
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve(server.address());
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
}

async function startLocalServer({ distDir, preferredPort = 4317 }) {
  const server = http.createServer((request, response) => {
    const asset = resolveAsset(distDir, request.url);
    if (!asset || !fs.existsSync(asset)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("B.R.A.C.E interface not built.");
      return;
    }
    const extension = path.extname(asset).toLowerCase();
    response.writeHead(200, {
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'self' https://api.openai.com; connect-src 'self' https://api.openai.com wss://api.openai.com; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self';",
      "Content-Type": MIME[extension] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(asset).pipe(response);
  });

  try {
    const address = await listen(server, preferredPort);
    return { server, port: typeof address === "object" && address ? address.port : preferredPort };
  } catch (error) {
    if (error?.code !== "EADDRINUSE") throw error;
    const address = await listen(server, 0);
    return { server, port: typeof address === "object" && address ? address.port : preferredPort };
  }
}

module.exports = { startLocalServer };
