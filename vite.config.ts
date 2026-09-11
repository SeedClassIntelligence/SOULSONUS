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
 * The realization route, in dev.
 *
 * The same handler the built server mounts, loaded through vite so it is one
 * implementation rather than two that can drift. Without this, `npm run dev`
 * answers `/api/e05` with index.html and the studio reports NO_SERVICE_ROUTE
 * -- which is what it did, and what made realization look unbuilt rather than
 * unhosted.
 */
const serveE05 = (): Plugin => ({
  name: 'soulsonus-e05-route',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!(req.url || '').startsWith('/api/e05')) return next();
      try {
        const mod = await server.ssrLoadModule('/server/e05Route.ts');
        const handled = await mod.handleE05(req, res, mod.configFromEnv());
        if (!handled) next();
      } catch (err) {
        // A route that throws while loading must not answer with the SPA:
        // the provider would read that as "this build has no route" and the
        // reason would be lost.
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: `The realization route failed to load: ${err instanceof Error ? err.message : String(err)}`,
          })
        );
      }
    });
  },
});

/**
 * The shared-session relay, in dev, by the same mechanism as the realization
 * route: one implementation in `server/`, reached identically whether the app
 * is running from `npm run dev` or from the built server.
 */
const serveCollab = (): Plugin => ({
  name: 'soulsonus-collab-route',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!(req.url || '').startsWith('/api/collab')) return next();
      try {
        const mod = await server.ssrLoadModule('/server/collabRoute.ts');
        const handled = await mod.handleCollab(req, res, mod.collabConfigFromEnv());
        if (!handled) next();
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: `The shared-session route failed to load: ${err instanceof Error ? err.message : String(err)}`,
          })
        );
      }
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
    plugins: [serveOrtRaw(), serveE05(), serveCollab(), react(), tailwindcss()],
    optimizeDeps: {
      /**
       * Kept out of the startup pre-bundle.
       *
       * `src/audio/soundFont.ts` imports these dynamically, the moment a
       * sound bank is actually loaded. Left in the pre-bundle they would be
       * read on launch anyway -- esbuild scans and rewrites every optimized
       * dependency when the server starts -- which defeats the point of the
       * dynamic import and, on a machine whose antivirus holds the Ogg
       * decoder, stops the dev server before the studio can open at all.
       *
       * Excluding them means the browser fetches them on demand instead.
       */
      exclude: ['spessasynth_core', 'stb-vorbis'],
    },
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
