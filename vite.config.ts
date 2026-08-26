import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * Serves the ONNX Runtime files straight off disk in dev.
 *
 * They live in `public/`, which vite normally serves untouched -- but the
 * runtime pulls its glue in with a dynamic `import()`, so the request arrives
 * as `/ort/ort-wasm-simd-threaded.mjs?import` and goes through the transform
 * pipeline instead. Emscripten glue does not survive that: vite answers 500
 * and the runtime reports "no available backend found", which reads like a
 * missing feature rather than a dev-server detail.
 */
const serveOrtRaw = (): Plugin => ({
  name: 'soulsonus-serve-ort-raw',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = (req.url || '').split('?')[0];
      if (!url.startsWith('/ort/')) return next();
      const file = path.resolve(__dirname, 'public', url.slice(1));
      if (!file.startsWith(path.resolve(__dirname, 'public/ort')) || !fs.existsSync(file)) return next();
      res.setHeader(
        'Content-Type',
        file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'
      );
      res.end(fs.readFileSync(file));
    });
  },
});

/**
 * The commit this bundle was built from, stamped into the page.
 *
 * Without it there is no way to tell a stale deploy from a broken change:
 * the build goes green, the site looks identical, and the only recourse is
 * guessing. Seven characters in the status bar settles it. Netlify exposes
 * COMMIT_REF; a local build reads git; neither means "dev".
 */
function buildId(): string {
  const fromCI = process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromCI) return fromCI.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig(() => {
  return {
    define: {
      __BUILD_ID__: JSON.stringify(buildId()),
    },
    plugins: [serveOrtRaw(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
