const fs = require('fs');
const SR = 48000;

function writeWav(path, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32000), 44 + i * 2);
  }
  fs.writeFileSync(path, buf);
}

// "Beatbox" clip: alternating low kick thumps (60Hz burst) and high snare/hat noise bursts
function beatbox(seconds, kickHz, hatBright) {
  const n = SR * seconds;
  const out = new Float32Array(n);
  const period = Math.floor(SR * 0.5); // event every 500ms
  for (let e = 0; e * period < n; e++) {
    const start = e * period;
    const isKick = e % 2 === 0;
    const len = Math.floor(SR * (isKick ? 0.18 : 0.08));
    for (let i = 0; i < len && start + i < n; i++) {
      const t = i / SR;
      const env = Math.exp(-t * (isKick ? 18 : 45));
      let s;
      if (isKick) {
        s = Math.sin(2 * Math.PI * kickHz * t) * 0.95;
      } else {
        // noise band biased high
        s = (Math.random() * 2 - 1) * hatBright;
      }
      out[start + i] += s * env;
    }
  }
  return out;
}

// Melodic hum clip: sustained tone at given Hz
function hum(seconds, hz) {
  const n = SR * seconds;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = 0.6 * (Math.sin(2*Math.PI*hz*t) + 0.35*Math.sin(4*Math.PI*hz*t) + 0.15*Math.sin(6*Math.PI*hz*t)) / 1.5;
  }
  return out;
}

const dir = process.argv[2] || process.env.SOULSONUS_VERIFY_DIR || '/tmp/soulsonus-verify';
require('fs').mkdirSync(dir, { recursive: true });
writeWav(dir + '/beatbox_A.wav', beatbox(12, 58, 0.9));   // deep kick, bright hats
writeWav(dir + '/beatbox_B.wav', beatbox(12, 95, 0.35));  // higher kick, dull hats
writeWav(dir + '/hum_A4.wav', hum(10, 440));              // A4
writeWav(dir + '/hum_C3.wav', hum(10, 130.81));           // C3
console.log('wrote wavs');
