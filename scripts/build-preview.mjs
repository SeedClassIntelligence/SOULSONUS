/**
 * A single-file build of the studio, for looking at.
 *
 * Not a deployment. The real build is `npm run build` behind a host that can
 * serve a SPA fallback, wasm with the right MIME type, and one function at
 * `/api/e05`. This exists for the case where that host is unavailable and
 * someone still needs to open the studio and see it -- so it trades away the
 * parts that need a server and keeps the parts that do not.
 *
 * What it does: inlines the CSS and JS, embeds the assets the app fetches at
 * runtime as data URIs, and installs a small `fetch` shim that answers those
 * paths from the embedded copies. Nothing in `src/` changes; the shim sits in
 * front of the bundle.
 *
 * What it cannot carry: the onnxruntime wasm is 13 MB before base64, which is
 * past the single-file ceiling, so transcription is unavailable here and says
 * so through the same path it already uses when a model is missing. There is
 * no `/api/e05` without a server, which the realization seam already reports
 * honestly. And a sandboxed frame may refuse the microphone, in which case
 * capture is unavailable -- which is most of what this studio is for, so this
 * is a way to see the studio rather than a way to use it.
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const OUT = 'dist/soulsonus-preview.html';

const assets = fs.readdirSync(path.join(DIST, 'assets'));
const jsName = assets.find((f) => f.startsWith('index-') && f.endsWith('.js'));
const cssName = assets.find((f) => f.startsWith('index-') && f.endsWith('.css'));
if (!jsName || !cssName) throw new Error('run `npm run build` first');

const js = fs.readFileSync(path.join(DIST, 'assets', jsName), 'utf8');
const css = fs.readFileSync(path.join(DIST, 'assets', cssName), 'utf8');

/** Paths the running app fetches, and what to answer them with. */
const EMBED = [
  ['/soundfonts/soulsonus-factory-kit.sf2', 'public/soundfonts/soulsonus-factory-kit.sf2', 'application/octet-stream'],
];

const embedded = {};
let embeddedBytes = 0;
for (const [urlPath, file, type] of EMBED) {
  if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
  const bytes = fs.readFileSync(file);
  embeddedBytes += bytes.length;
  embedded[urlPath] = { type, b64: bytes.toString('base64') };
}

const shim = `
<script>
(function () {
  // The app fetches a handful of absolute paths that a single file has no
  // server to answer. They are embedded above; this hands them back with the
  // same shape a real response has, so nothing in the app knows the
  // difference. Anything else absolute is refused with a 404 and a reason,
  // rather than being allowed to resolve to this page's own HTML -- which is
  // the failure that once had a wasm loader reading "<!do" as a magic word.
  const EMBEDDED = ${JSON.stringify(embedded)};
  const KNOWN_MISSING = {
    '/ort/': 'The onnxruntime wasm is too large to carry in a single file, so transcription is unavailable in this preview.',
    '/models/': 'The transcription model is not carried in this preview.',
    '/api/': 'There is no server behind this preview, so realization cannot be attempted.',
    '/audio/': 'Demo audio is not carried in this preview.',
  };
  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    let p = url;
    try { p = new URL(url, location.href).pathname; } catch (e) { /* keep as given */ }
    const hit = EMBEDDED[p];
    if (hit) {
      // Decoded here rather than fetched as a data: URI, because a page under
      // a strict connect-src has no business making a request for bytes that
      // are already in it.
      const bin = atob(hit.b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return Promise.resolve(new Response(buf, { status: 200, headers: { 'Content-Type': hit.type } }));
    }
    for (const prefix in KNOWN_MISSING) {
      if (p.indexOf(prefix) === 0) {
        return Promise.resolve(new Response(KNOWN_MISSING[prefix], { status: 404, statusText: 'Not in this preview' }));
      }
    }
    return realFetch(input, init);
  };
  window.__SOULSONUS_PREVIEW = true;
})();
</script>`;

// The charset matters: served without one, the bundle's em-dashes arrive as
// mojibake. Harmless where the host already declares UTF-8, necessary where
// it does not.
const html = `<meta charset="utf-8">
<title>SoulSonus Studio</title>
<style>${css}</style>
${shim}
<div id="root"></div>
<script type="module">${js}</script>
`;

fs.writeFileSync(OUT, html);
const size = fs.statSync(OUT).size;
console.log(`js       ${(js.length / 1048576).toFixed(2)} MB`);
console.log(`css      ${(css.length / 1024).toFixed(0)} KB`);
console.log(`embedded ${(embeddedBytes / 1048576).toFixed(2)} MB raw -> ${(Object.values(embedded).map((e) => e.b64).join('').length / 1048576).toFixed(2)} MB base64`);
console.log(`written  ${OUT}`);
console.log(`total    ${(size / 1048576).toFixed(2)} MB`);
