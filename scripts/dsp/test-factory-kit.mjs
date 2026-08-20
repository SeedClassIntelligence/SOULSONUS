/**
 * Does the factory kit actually make the sounds it claims?
 *
 * A bank that loads is not a bank that plays. This renders every drum in the
 * kit through the same SpessaSynth processor the studio uses and measures
 * what comes back: that each key produces audio at all, that the velocity
 * layers are different recordings rather than one sample turned down, and
 * that two different drums are actually two different sounds.
 *
 * The velocity check is the one that matters. Mapping recorded dynamics to
 * velocity bands is the whole reason to build a sampled kit instead of
 * shaping a synth, and the failure it has to rule out is subtle: a bank that
 * maps ONE sample across every band and lets the velocity curve scale it
 * would look right in every count and sound wrong to a drummer.
 *
 * So what is measured is whether a soft hit and a hard hit are different
 * *recordings*. Both are normalised to the same peak and correlated: one
 * sample at two gains correlates at essentially 1.0, and two takes of a drum
 * cannot. Brightness was the first thing tried and it was the wrong test --
 * the source snares measure 3170, 3512 and 3008 Hz from softest to hardest,
 * so this snare's spectrum does not rise with dynamic even though the
 * recordings are plainly different. Kick and hi-hat do brighten, and that is
 * reported where it holds rather than asserted everywhere.
 */
import fs from 'node:fs';
import { SoundBankLoader, SpessaSynthProcessor } from 'spessasynth_core';

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} ${detail}`);
};

const SR = 44100;
const file = 'public/soundfonts/soulsonus-factory-kit.sf2';
const bytes = fs.readFileSync(file);
const bank = SoundBankLoader.fromArrayBuffer(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
);

async function render(key, velocity, seconds = 2) {
  const synth = new SpessaSynthProcessor(SR, { eventsEnabled: false });
  await synth.processorInitialized;
  synth.soundBankManager.addSoundBank(bank, 'main');
  synth.programChange(0, 0);
  const total = Math.ceil(seconds * SR);
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  const BLOCK = 128;
  for (let i = 0; i < total; i += BLOCK) {
    if (i === 0) synth.noteOn(0, key, velocity);
    if (i >= SR * 0.25 && i < SR * 0.25 + BLOCK) synth.noteOff(0, key);
    synth.process(left, right, i, Math.min(BLOCK, total - i));
  }
  return left;
}

const peak = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const rms = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);

/** Spectral centroid in Hz: where the energy sits, which is what "bright" means. */
function centroid(x) {
  const N = 4096;
  const seg = x.slice(0, N);
  let num = 0;
  let den = 0;
  for (let k = 1; k < N / 2; k += 2) {
    const w = (2 * Math.PI * k) / N;
    let re = 0;
    let im = 0;
    for (let i = 0; i < N; i++) {
      re += seg[i] * Math.cos(w * i);
      im -= seg[i] * Math.sin(w * i);
    }
    const mag = Math.hypot(re, im);
    num += mag * ((k * SR) / N);
    den += mag;
  }
  return den > 0 ? num / den : 0;
}

console.log('=== THE FACTORY KIT ===\n');
console.log(`  ${file} — ${(bytes.length / 1048576).toFixed(2)} MB, ${bank.presets.length} preset(s), ${bank.samples.length} samples`);

check('the bank names itself', bank.presets[0]?.name === 'SoulSonus Factory Kit', bank.presets[0]?.name || 'unnamed');
check('sixteen samples, as built', bank.samples.length === 16, `${bank.samples.length} samples`);

console.log('\n-- every drum sounds --');
const KEYS = [
  [36, 'Kick'],
  [37, 'Side Stick'],
  [38, 'Snare'],
  [42, 'Closed Hi-Hat'],
  [44, 'Pedal Hi-Hat'],
  [46, 'Open Hi-Hat'],
];
const voices = {};
for (const [key, name] of KEYS) {
  const audio = await render(key, 100);
  voices[key] = audio;
  check(`key ${key} — ${name}`, peak(audio) > 0.01, `peak ${peak(audio).toFixed(3)}, centroid ${Math.round(centroid(audio))} Hz`);
}

console.log('\n-- and they are different sounds --');
check(
  'the kick is lower than the hat',
  centroid(voices[36]) < centroid(voices[42]),
  `kick ${Math.round(centroid(voices[36]))} Hz vs closed hat ${Math.round(centroid(voices[42]))} Hz`
);
const ring = (x) => rms(x.slice(Math.round(SR * 0.4), Math.round(SR * 0.9)));
check(
  'the open hat rings on where the closed one has stopped',
  ring(voices[46]) > 0.001 && ring(voices[46]) > ring(voices[42]) * 8,
  `0.4-0.9s: open ${ring(voices[46]).toExponential(2)} vs closed ${ring(voices[42]).toExponential(2)}`
);

console.log('\n-- the velocity layers are different recordings --');

/** 1.0 means the same waveform at a different gain. Anything less is another take. */
function correlation(a, b) {
  const n = Math.min(a.length, b.length, SR);
  const pa = peak(a.slice(0, n)) || 1;
  const pb = peak(b.slice(0, n)) || 1;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] / pa;
    const y = b[i] / pb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

for (const [key, name, count] of [[36, 'Kick', 4], [38, 'Snare', 5], [42, 'Closed Hi-Hat', 4]]) {
  const soft = await render(key, 20);
  const hard = await render(key, 120);
  const r = correlation(soft, hard);
  check(
    `${name}: soft and hard are different takes`,
    r < 0.9,
    `correlation ${r.toFixed(3)} after normalising — 1.000 would mean one sample re-scaled, across ${count} layers`
  );
  check(
    `${name}: and velocity still changes the level`,
    peak(hard) > peak(soft) * 4,
    `peak ${peak(soft).toFixed(3)} at v20 -> ${peak(hard).toFixed(3)} at v120`
  );
  console.log(
    `        brightness: ${Math.round(centroid(soft))} Hz -> ${Math.round(centroid(hard))} Hz` +
      `${centroid(hard) > centroid(soft) * 1.05 ? ' (brighter when hit harder)' : ' (this drum does not brighten with dynamic)'}`
  );
}

// The same measure has to be able to say "same sample" when it is one, or it
// proves nothing above.
const twiceTheSame = correlation(await render(36, 120), await render(36, 120));
check(
  'the measure recognises an identical take',
  twiceTheSame > 0.999,
  `correlation ${twiceTheSame.toFixed(4)} rendering the same hit twice`
);

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
