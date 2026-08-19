/**
 * Puts the ONNX Runtime wasm files where the app can serve them.
 *
 * They are copied at build time rather than committed: the plain wasm build is
 * 13 MB and the WebGPU one 27 MB, which is not something to carry in git for a
 * file that npm already pins. `basicPitch.ts` points the runtime at exactly
 * these two by name, so the loader never reaches for the WebGPU variant it
 * would otherwise prefer and we never ship 27 MB to run a 230 KB model on the
 * CPU.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../node_modules/onnxruntime-web/dist');
const OUT = path.resolve(__dirname, '../public/ort');
const FILES = ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'];

fs.mkdirSync(OUT, { recursive: true });
for (const f of FILES) {
  const from = path.join(SRC, f);
  if (!fs.existsSync(from)) {
    console.error(`[copy-ort] missing ${from} — is onnxruntime-web installed?`);
    process.exit(1);
  }
  const to = path.join(OUT, f);
  fs.copyFileSync(from, to);
  console.log(`[copy-ort] ${f} (${(fs.statSync(to).size / 1e6).toFixed(1)} MB)`);
}
