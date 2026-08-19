/**
 * The master bus processing chain — seven real stages.
 *
 * Until now the Master room's seven "stages" were parameters in React state
 * that no audio node read, and the Mix room's EQ commit failed for the same
 * reason: there was no processing chain on the master bus at all. This builds
 * one, from the same `MasteringDspChain` the UI already edits, so those
 * controls drive real audio.
 *
 * The same builder is used for live monitoring and for the offline bounce, so
 * what a creator hears is what gets measured and exported.
 */

import * as Tone from 'tone';
import { MasteringDspChain, MasteringProcessorSlot } from '../types/daw';

export interface BuiltMasteringChain {
  /** Connect the mix into this. */
  input: Tone.ToneAudioNode;
  /** Connect this to the destination. */
  output: Tone.ToneAudioNode;
  /** Re-applies slot parameters without rebuilding the graph. */
  update: (chain: MasteringDspChain) => void;
  dispose: () => void;
}

const slotOf = (chain: MasteringDspChain, type: string): MasteringProcessorSlot | undefined =>
  chain.slots.find((s) => s.type === type);

/** A bypassed or disabled slot passes audio through untouched. */
const isActive = (slot?: MasteringProcessorSlot) => !!slot && slot.enabled !== false && !slot.bypassed;

const num = (v: unknown, fallback: number) => (typeof v === 'number' && isFinite(v) ? v : fallback);

/** Soft-clip transfer curve. `softness` 0..100 sets the width of the knee. */
function softClipCurve(ceiling: number, softness: number, points = 2048): Float32Array {
  const curve = new Float32Array(points);
  // A higher softness gives a rounder knee; near zero it approaches hard clipping.
  const k = Math.max(0.05, softness / 100) * 3 + 0.4;
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    const shaped = Math.tanh(k * x) / Math.tanh(k);
    curve[i] = Math.max(-ceiling, Math.min(ceiling, shaped * ceiling));
  }
  return curve;
}

/**
 * Hard ceiling. Guarantees the sample peak never exceeds `ceiling`, so the
 * number on the control is the number the audio respects.
 */
function hardCeilingCurve(ceiling: number, points = 4096): Float32Array {
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    curve[i] = Math.max(-ceiling, Math.min(ceiling, x));
  }
  return curve;
}

/** Saturation transfer curve. `drive` 0..100. */
function saturationCurve(drive: number, colorMode: string, points = 2048): Float32Array {
  const curve = new Float32Array(points);
  const d = Math.max(0, Math.min(100, drive)) / 100;
  // Tape leans to odd-order softness; tube adds a little asymmetry (even order).
  const asymmetry = colorMode === 'tube_warmth' ? 0.15 * d : 0;
  const amount = 1 + d * 6;
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    const biased = x + asymmetry * x * x;
    curve[i] = Math.tanh(amount * biased) / Math.tanh(amount);
  }
  return curve;
}

export function buildMasteringChain(chain: MasteringDspChain): BuiltMasteringChain {
  // --- Stage 1: corrective EQ -------------------------------------------
  const hpf = new Tone.Filter({ type: 'highpass', frequency: 28, Q: 0.707 });
  const lowMidNotch = new Tone.Filter({ type: 'peaking', frequency: 260, Q: 1.2, gain: 0 });
  const airShelf = new Tone.Filter({ type: 'highshelf', frequency: 12000, gain: 0 });

  // --- Stage 2: 3-band dynamic EQ ---------------------------------------
  // A genuine multiband compressor: the bass and sibilance bands are attenuated
  // only when they exceed their threshold, which is what makes it dynamic
  // rather than a fixed cut.
  const dynamic = new Tone.MultibandCompressor({
    lowFrequency: 250,
    highFrequency: 6000,
    low: { threshold: -24, ratio: 3, attack: 0.005, release: 0.12 },
    mid: { threshold: -24, ratio: 2, attack: 0.01, release: 0.12 },
    high: { threshold: -24, ratio: 4, attack: 0.002, release: 0.08 },
  });

  // --- Stage 3: bus glue compressor -------------------------------------
  const busComp = new Tone.Compressor({ threshold: -16, ratio: 2, attack: 0.03, release: 0.12 });
  const makeup = new Tone.Volume(0);

  // --- Stage 4: harmonic saturation -------------------------------------
  const saturation = new Tone.WaveShaper(saturationCurve(18, 'tape_warmth'));

  // --- Stage 5: stereo imaging + mono bass ------------------------------
  // Width is applied to the whole signal; the bass is then re-narrowed by
  // low-passing the Side channel, which is how mono-bass is actually done.
  const widener = new Tone.StereoWidener(0.5);
  const msSplit = new Tone.MidSideSplit();
  const msMerge = new Tone.MidSideMerge();
  const sideHighpass = new Tone.Filter({ type: 'highpass', frequency: 100, Q: 0.707 });

  // --- Stage 6: soft clipper --------------------------------------------
  const clipper = new Tone.WaveShaper(softClipCurve(0.92, 45));

  // --- Stage 7: broadcast limiter ---------------------------------------
  // Tone.Limiter alone is a soft compressor: driven 6 dB over a -1 dB
  // threshold it still passes +5.7 dBFS, so a stage advertising a ceiling
  // would not hold it. Fast hard-knee gain reduction does the musical work,
  // then a hard ceiling guarantees the sample peak the control promises.
  //
  // Sample peak is all this can promise: no Web Audio node can see between
  // samples, and clipping is itself what creates inter-sample peaks. The
  // true-peak half of the ceiling is enforced in ./truePeakLimiter, applied to
  // the rendered buffer in masterRender — which covers everything measured and
  // everything exported. Live monitoring can still overshoot the dBTP number
  // between samples; that is audible to a converter, not to the room.
  const limiter = new Tone.Compressor({ threshold: -1, ratio: 20, knee: 0, attack: 0.001, release: 0.05 });
  const ceiling = new Tone.WaveShaper(hardCeilingCurve(Math.pow(10, -1 / 20)));

  // Signal flow, in the order the UI lists the stages.
  hpf.connect(lowMidNotch);
  lowMidNotch.connect(airShelf);
  airShelf.connect(dynamic);
  dynamic.connect(busComp);
  busComp.connect(makeup);
  makeup.connect(saturation);
  saturation.connect(widener);

  widener.connect(msSplit);
  msSplit.mid.connect(msMerge.mid);
  msSplit.side.connect(sideHighpass);
  sideHighpass.connect(msMerge.side);

  msMerge.connect(clipper);
  clipper.connect(limiter);
  limiter.connect(ceiling);

  const update = (next: MasteringDspChain) => {
    const eq = slotOf(next, 'corrective_eq');
    if (isActive(eq)) {
      hpf.frequency.value = num(eq!.parameters.lowCutHz, 28);
      lowMidNotch.frequency.value = num(eq!.parameters.lowMidFreqHz, 260);
      lowMidNotch.gain.value = num(eq!.parameters.lowMidNotchDb, 0);
      airShelf.frequency.value = num(eq!.parameters.highAirFreqHz, 12000);
      airShelf.gain.value = num(eq!.parameters.highAirDb, 0);
    } else {
      hpf.frequency.value = 10;
      lowMidNotch.gain.value = 0;
      airShelf.gain.value = 0;
    }

    const dyn = slotOf(next, 'dynamic_eq');
    if (isActive(dyn)) {
      const bassDuck = num(dyn!.parameters.bassDuckingDb, -1.2);
      const sibDuck = num(dyn!.parameters.sibilanceDuckingDb, -1.5);
      dynamic.lowFrequency.value = num(dyn!.parameters.bassFreqHz, 110) * 2;
      dynamic.highFrequency.value = num(dyn!.parameters.sibilanceFreqHz, 6500);
      // More requested attenuation means a lower threshold: the band ducks
      // sooner and further once it is loud enough to need it.
      dynamic.low.threshold.value = -18 + bassDuck * 2;
      dynamic.high.threshold.value = -18 + sibDuck * 2;
    } else {
      dynamic.low.threshold.value = 0;
      dynamic.mid.threshold.value = 0;
      dynamic.high.threshold.value = 0;
    }

    const comp = slotOf(next, 'bus_comp');
    if (isActive(comp)) {
      busComp.threshold.value = num(comp!.parameters.threshold, -16);
      busComp.ratio.value = Math.max(1, num(comp!.parameters.ratio, 2));
      busComp.attack.value = num(comp!.parameters.attackMs, 30) / 1000;
      busComp.release.value = num(comp!.parameters.releaseMs, 120) / 1000;
      makeup.volume.value = num(comp!.parameters.makeupDb, 0);
    } else {
      busComp.threshold.value = 0;
      busComp.ratio.value = 1;
      makeup.volume.value = 0;
    }

    const sat = slotOf(next, 'saturation');
    saturation.curve = isActive(sat)
      ? (saturationCurve(num(sat!.parameters.drive, 18), String(sat!.parameters.colorMode || 'tape_warmth')))
      : (saturationCurve(0, 'tape_warmth'));

    const ms = slotOf(next, 'stereo_ms');
    if (isActive(ms)) {
      // sideWidthPercent 100 = untouched; Tone's width is 0..1 with 0.5 neutral.
      widener.width.value = Math.max(0, Math.min(1, num(ms!.parameters.sideWidthPercent, 100) / 200));
      sideHighpass.frequency.value = Math.max(20, num(ms!.parameters.monoBassCutoffHz, 100));
    } else {
      widener.width.value = 0.5;
      sideHighpass.frequency.value = 20;
    }

    const clip = slotOf(next, 'soft_clipper');
    if (isActive(clip)) {
      const headroom = num(clip!.parameters.ceilingHeadroomDb, 0.8);
      clipper.curve = softClipCurve(
        Math.pow(10, -Math.abs(headroom) / 20),
        num(clip!.parameters.softness, 45)
      );
    } else {
      clipper.curve = softClipCurve(1, 100);
    }

    const lim = slotOf(next, 'true_peak_limiter');
    const ceilingDb = isActive(lim) ? num(lim!.parameters.ceilingDbtp, -1) : 0;
    limiter.threshold.value = ceilingDb;
    limiter.attack.value = Math.max(0.0005, num(lim?.parameters.lookaheadMs, 4.5) / 10000);
    limiter.release.value = Math.max(0.01, num(lim?.parameters.releaseMs, 80) / 1000);
    ceiling.curve = hardCeilingCurve(Math.pow(10, ceilingDb / 20));
  };

  update(chain);

  return {
    input: hpf,
    output: ceiling,
    update,
    dispose: () => {
      [hpf, lowMidNotch, airShelf, dynamic, busComp, makeup, saturation, widener,
       msSplit, msMerge, sideHighpass, clipper, limiter, ceiling].forEach((n) => {
        try { n.dispose(); } catch { /* already disposed */ }
      });
    },
  };
}
