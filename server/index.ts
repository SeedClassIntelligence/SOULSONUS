/**
 * The host the built studio was always written for.
 *
 * `scripts/build-preview.mjs` describes it exactly: "the real build is
 * `npm run build` behind a host that can serve a SPA fallback, wasm with the
 * right MIME type, and one function at `/api/e05`." All three were described
 * and none existed, so `npm run build` produced a bundle with nowhere to run
 * that could answer its own realization calls.
 *
 * Built to `server.js` -- which `npm run clean` has been deleting since before
 * it was ever written.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { configFromEnv, handleE05 } from './e05Route';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(dirname, 'dist');
const PORT = Number(process.env.PORT || 8080);

const app = express();
const cfg = configFromEnv();

// The realization route first, so no static handler or SPA fallback can
// answer it with index.html -- which is exactly the failure the provider's
// own guard was written to catch.
app.use(async (req, res, next) => {
  const handled = await handleE05(req, res, cfg);
  if (!handled) next();
});

app.use(
  express.static(DIST, {
    setHeaders: (res, filePath) => {
      // The ONNX runtime refuses to start when its wasm arrives as
      // application/octet-stream, and reports it as "no available backend
      // found" -- which reads like a missing feature rather than a MIME type.
      if (filePath.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
    },
  })
);

// SPA fallback, last: anything that is not a file and not the route is the app.
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, () => {
  // The endpoint is printed here, on the server's own console, and nowhere a
  // browser can read it.
  console.log(`SoulSonus on :${PORT} — realization host ${cfg.endpoint || '(not configured)'}`);
});
