/**
 * Builds the SoulSonus factory drum kit as a SoundFont.
 *
 * The sourcing decision put a curated catalogue in front of the factory, and
 * this is the first thing to come through it. The source is the Versilian
 * Community Sample Library, whose LICENSE file at the repository root is the
 * verbatim text of CC0 1.0 Universal -- read at the source, not recalled --
 * and whose README states the intent plainly: "you can do whatever you want
 * with these sounds (even make commercial software), no royalties, no credit,
 * no special terms", and that the set exists as "a convenient starting place
 * for factory libraries". That is the cleanest clearance available and it is
 * why this library went first.
 *
 * The bank is built rather than downloaded because SoulSonus has to own the
 * copy it ships: CC0 permits redistribution, and building it here means the
 * bytes in `public/soundfonts` are ours to checksum, admit and serve.
 *
 * Two deliberate limits, stated because the alternative is a claim that is
 * not true:
 *
 *  - Only the `rr1` take of each dynamic is used. VCSL records two takes per
 *    dynamic, and playing them in rotation is round-robin -- something
 *    SoundFont cannot express. Two zones over the same key and velocity range
 *    layer in SF2; they do not alternate. So the second take waits for a
 *    player that can rotate it, rather than being mapped somewhere it would
 *    sound wrong.
 *  - Samples are summed to mono. SF2 stores stereo as two linked mono
 *    samples, which doubles the bank for a kit whose sources are close-miked
 *    and near-centred anyway.
 *  - Every sample is peak-normalised, and the gain applied is reported. This
 *    is not cosmetic. VCSL records the dynamics into the files themselves --
 *    the softest snare peaks at 0.033 and the hardest at 0.711, 27 dB apart
 *    -- and SoundFont already applies its own velocity-to-attenuation curve
 *    on top. Shipping the recorded levels unchanged applies the dynamics
 *    twice: a hit at velocity 20 selects the quiet sample and then attenuates
 *    it by another 32 dB, which measured as silence. Normalised, the layer
 *    supplies the timbre of a soft hit and the velocity curve supplies its
 *    loudness, which is how a sampled kit is supposed to work.
 *
 * Usage:  node scripts/build-factory-kit.mjs <path-to-VCSL-checkout>
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  BasicInstrument,
  BasicPreset,
  BasicSample,
  BasicSoundBank,
  SampleTypes,
} from 'spessasynth_core';

/** Generator numbers, from the SoundFont spec. */
const GEN = { releaseVolEnv: 38, sampleModes: 54 };

const SRC = process.argv[2];
const OUT = path.resolve('public/soundfonts/soulsonus-factory-kit.sf2');

if (!SRC) {
  console.error('Usage: node scripts/build-factory-kit.mjs <path-to-VCSL-checkout>');
  process.exit(1);
}

/**
 * The kit, as General MIDI numbers it.
 *
 * Each entry is one drum: where it sits on the keyboard, and the recorded
 * dynamics that make it, quietest first. The velocity range for each layer is
 * divided evenly across 1..127, so a soft beatboxed hit reaches the soft
 * recording rather than the same sample turned down.
 */
const KIT = [
  {
    key: 36,
    name: 'Kick',
    dir: 'Membranophones/Struck Membranophones/Bass Drum 1',
    layers: ['BDrumNew_hit_v2_rr1_Sum.wav', 'BDrumNew_hit_v3_rr1_Sum.wav', 'BDrumNew_hit_v5_rr1_Sum.wav', 'BDrumNew_hit_v7_rr1_Sum.wav'],
  },
  {
    key: 37,
    name: 'Side Stick',
    dir: 'Membranophones/Struck Membranophones/Snare Drum, Modern 1',
    layers: ['Snare2_stick_v1_rr1_Mid.wav'],
  },
  {
    key: 38,
    name: 'Snare',
    dir: 'Membranophones/Struck Membranophones/Snare Drum, Modern 1',
    layers: [
      'Snare2_HitSN_v3_rr1_Mid.wav',
      'Snare2_HitSN_v5_rr1_Mid.wav',
      'Snare2_HitSN_v6_rr1_Mid.wav',
      'Snare2_HitSN_v7_rr1_Mid.wav',
      'Snare2_HitSN_v9_rr1_Mid.wav',
    ],
  },
  {
    key: 42,
    name: 'Closed Hi-Hat',
    dir: 'Idiophones/Struck Idiophones/Hi-Hat Cymbal',
    layers: ['HiHat_HitC_v1_rr1_Mid.wav', 'HiHat_HitC_v2_rr1_Mid.wav', 'HiHat_HitC_v3_rr1_Mid.wav', 'HiHat_HitC_v4_rr1_Mid.wav'],
  },
  { key: 44, name: 'Pedal Hi-Hat', dir: 'Idiophones/Struck Idiophones/Hi-Hat Cymbal', layers: ['HiHat_Close_rr1_Mid.wav'] },
  { key: 46, name: 'Open Hi-Hat', dir: 'Idiophones/Struck Idiophones/Hi-Hat Cymbal', layers: ['HiHat_HitO_rr1_Mid.wav'] },
];

/** Minimal RIFF/WAVE reader. 16-bit PCM is what VCSL ships. */
function readWav(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${file} is not a RIFF/WAVE file`);
  }
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(body, body + size);
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`${file} has no fmt/data chunk`);
  if (fmt.bits !== 16) throw new Error(`${file} is ${fmt.bits}-bit; this builder reads 16-bit PCM`);

  const frames = Math.floor(data.length / 2 / fmt.channels);
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) sum += data.readInt16LE((i * fmt.channels + c) * 2) / 32768;
    mono[i] = sum / fmt.channels;
  }
  return { mono, sampleRate: fmt.sampleRate, channels: fmt.channels };
}

/**
 * Cuts the silence a close-miked room leaves at both ends.
 *
 * The tail threshold is -60 dBFS with a 20 ms fade, so nothing audible is
 * removed and nothing ends on a step. On this kit it is most of the file: a
 * hi-hat is a 40 ms sound followed by a second of room.
 */
function trim(mono, sampleRate) {
  const HEAD = 10 ** (-70 / 20);
  const TAIL = 10 ** (-60 / 20);
  let start = 0;
  while (start < mono.length && Math.abs(mono[start]) < HEAD) start++;
  start = Math.max(0, start - 32);
  let end = mono.length;
  while (end > start && Math.abs(mono[end - 1]) < TAIL) end--;
  end = Math.min(mono.length, end + Math.round(sampleRate * 0.005));
  const out = mono.slice(start, end);
  const fade = Math.min(out.length, Math.round(sampleRate * 0.02));
  for (let i = 0; i < fade; i++) out[out.length - fade + i] *= 1 - i / fade;
  return out;
}

/** Velocity bands over 1..127, quietest layer first. */
function bands(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      min: i === 0 ? 0 : Math.round((127 * i) / count) + 1,
      max: i === count - 1 ? 127 : Math.round((127 * (i + 1)) / count),
    });
  }
  return out;
}

const bank = new BasicSoundBank();
bank.soundBankInfo = {
  name: 'SoulSonus Factory Kit',
  engineer: 'SoulSonus',
  comment:
    'Acoustic kit built from the Versilian Community Sample Library (CC0 1.0 Universal). ' +
    'Velocity layers from the recorded dynamics; summed to mono; tails trimmed at -60 dBFS; ' +
    'samples peak-normalised so the velocity curve is applied once rather than twice.',
  ...(bank.soundBankInfo || {}),
};

const preset = new BasicPreset(bank);
preset.name = 'SoulSonus Factory Kit';
preset.program = 0;
preset.bankMSB = 0;
preset.bankLSB = 0;

const instrument = new BasicInstrument();
instrument.name = 'Factory Kit';

let totalFrames = 0;
const report = [];

for (const drum of KIT) {
  const ranges = bands(drum.layers.length);
  drum.layers.forEach((fileName, i) => {
    const file = path.join(SRC, drum.dir, fileName);
    if (!fs.existsSync(file)) throw new Error(`missing source sample: ${file}`);
    const { mono, sampleRate, channels } = readWav(file);
    const audio = trim(mono, sampleRate);
    const sourcePeak = audio.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    const gain = sourcePeak > 0 ? 0.99 / sourcePeak : 1;
    for (let n = 0; n < audio.length; n++) audio[n] *= gain;
    totalFrames += audio.length;

    // The sample's original key is the key it is mapped to, so the synth
    // plays it back at the pitch it was recorded rather than transposing a
    // drum by two octaves.
    const sample = new BasicSample(
      `${drum.name} ${i + 1}`.slice(0, 20),
      sampleRate,
      drum.key,
      0,
      SampleTypes.monoSample,
      0,
      audio.length - 1
    );
    sample.setAudioData(audio, sampleRate);
    bank.addSamples(sample);

    const zone = instrument.createZone(sample);
    zone.keyRange = { min: drum.key, max: drum.key };
    zone.velRange = ranges[i];
    // A drum is a one-shot. `sampleModes` 0 is no loop, so it plays once and
    // stops, and a two-second release means a note-off on a 16th-note grid
    // does not chop the tail off an open hat.
    zone.setGenerator(GEN.sampleModes, 0);
    zone.setGenerator(GEN.releaseVolEnv, 1200);

    report.push({
      drum: drum.name,
      key: drum.key,
      vel: `${ranges[i].min}-${ranges[i].max}`,
      seconds: +(audio.length / sampleRate).toFixed(3),
      wasSeconds: +(mono.length / sampleRate).toFixed(3),
      sourcePeak: +sourcePeak.toFixed(3),
      gainDb: +(20 * Math.log10(gain)).toFixed(1),
      channels,
      file: fileName,
    });
  });
}

bank.addInstruments(instrument);
const presetZone = preset.createZone(instrument);
presetZone.keyRange = { min: 0, max: 127 };
bank.addPresets(preset);

const out = bank.writeSF2();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(out));

const bytes = fs.statSync(OUT).size;
const sha = crypto.createHash('sha256').update(fs.readFileSync(OUT)).digest('hex');

console.log(`\n${report.length} samples, ${KIT.length} drums`);
for (const r of report) {
  console.log(
    `  key ${String(r.key).padEnd(3)} ${r.drum.padEnd(15)} vel ${r.vel.padEnd(8)} ` +
      `${r.wasSeconds}s -> ${r.seconds}s  peak ${String(r.sourcePeak).padEnd(6)} ${r.gainDb > 0 ? '+' : ''}${r.gainDb} dB  ${r.file}`
  );
}
console.log(`\ntotal audio: ${(totalFrames / 44100).toFixed(2)}s`);
console.log(`written: ${OUT}`);
console.log(`bytes:   ${bytes} (${(bytes / 1048576).toFixed(2)} MB)`);
console.log(`sha256:  ${sha}`);
