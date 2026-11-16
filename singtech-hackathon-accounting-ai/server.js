import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("./public/", import.meta.url));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

export function createApp() {
  return createServer(async (req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");
    const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).slice(1);
    const filePath = normalize(join(ROOT, relative));
    const type = MIME_TYPES[extname(filePath)];

    if (!filePath.startsWith(ROOT) || !type) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }

    try {
      const body = await readFile(filePath);
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" }).end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => {
    console.log(`SingTech AI running at http://localhost:${port}`);
  });
}
