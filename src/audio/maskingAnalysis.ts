/**
 * Cross-channel masking analysis, measured from the audio.
 *
 * The Mix room's advisor used to be a literal array: the same two proposals at
 * the same 99% and 97% confidence on a full project and on an empty canvas.
 * That could not be repaired by tuning, and it needed audio to exist before it
 * could be replaced — which it now does.
 *
 * This bounces each track on its own, measures where two tracks put energy in
 * the same band at the same time, and reports what it found in the units it
 * measured. No confidence score: a percentage that is not derived from the
 * signal is exactly what was wrong before.
 */

import { MasteringDspChain, Track } from '../types/daw';
import { renderMasterBounce } from './masterRender';
import { byteSpectrum, hannWindow, toMono } from './fft';
import { BAND_EDGES, BAND_NAMES, BandName } from './performanceClassifier';

const FFT_SIZE = 1024;
const HOP_SIZE = 512;
/** A band must carry at least this share of a track's frame energy to count as active. */
const ACTIVE_SHARE = 0.15;
/** Below this, an overlap is not worth a creator's attention. */
const MIN_OVERLAP_FRAMES = 0.08;

export interface MaskingFinding {
  trackAId: string;
  trackAName: string;
  trackBId: string;
  trackBName: string;
  band: BandName;
  centerHz: number;
  /** Share of the take where both tracks are active in this band, 0..1. */
  overlapRatio: number;
  /** How much of each track's own energy sits in the contested band, 0..1. */
  aShare: number;
  bShare: number;
  /** Which track is quieter in the band, and therefore the one being covered. */
  maskedTrackId: string;
}

export interface MaskingReport {
  findings: MaskingFinding[];
  tracksAnalyzed: number;
  framesAnalyzed: number;
  /** Set when there was nothing to analyse, so the UI can say so plainly. */
  emptyReason?: string;
}

function bandCenter(name: BandName): number {
  const [lo, hi] = BAND_EDGES[name];
  return Math.round(Math.sqrt(lo * hi));
}

/** Per-frame band activity for one track: activity[band][frame] = share of frame energy. */
function bandActivity(mono: Float32Array, sampleRate: number): { shares: Record<BandName, Float32Array>; frames: number } {
  const window = hannWindow(FFT_SIZE);
  const frames = Math.max(0, Math.floor((mono.length - FFT_SIZE) / HOP_SIZE) + 1);
  const shares = {} as Record<BandName, Float32Array>;
  for (const n of BAND_NAMES) shares[n] = new Float32Array(frames);

  const binHz = sampleRate / FFT_SIZE;
  for (let f = 0; f < frames; f++) {
    const frame = mono.subarray(f * HOP_SIZE, f * HOP_SIZE + FFT_SIZE);
    let rms = 0;
    for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i];
    rms = Math.sqrt(rms / frame.length);
    if (rms < 0.002) continue; // silence contributes nothing

    const spec = byteSpectrum(frame, window);
    // Subtract the frame's noise floor, as elsewhere, so quiet bins do not
    // register as activity.
    const sorted = Array.from(spec).sort((a, b) => a - b);
    const floor = sorted[Math.floor(sorted.length * 0.4)] ?? 0;

    let total = 0;
    const raw: Record<string, number> = {};
    for (const name of BAND_NAMES) {
      const [lo, hi] = BAND_EDGES[name];
      let sum = 0;
      for (let b = Math.floor(lo / binHz); b <= Math.min(spec.length - 1, Math.ceil(hi / binHz)); b++) {
        sum += Math.max(0, spec[b] - floor);
      }
      raw[name] = sum;
      total += sum;
    }
    if (total <= 0) continue;
    for (const name of BAND_NAMES) shares[name][f] = raw[name] / total;
  }
  return { shares, frames };
}

/**
 * Bounces each audible track on its own and reports where two of them compete
 * for the same band at the same time.
 */
export async function analyzeMasking(
  tracks: Track[],
  bpm: number,
  chain: MasteringDspChain,
  bars?: number
): Promise<MaskingReport> {
  const audible = tracks.filter((t) => !t.mute && ((t.noteEvents?.length ?? 0) > 0 || t.steps.some(Boolean)));
  if (audible.length < 2) {
    return {
      findings: [],
      tracksAnalyzed: audible.length,
      framesAnalyzed: 0,
      emptyReason:
        audible.length === 0
          ? 'Nothing is playing yet, so there is nothing to compare.'
          : 'Only one track is playing — masking needs at least two.',
    };
  }

  const perTrack: { track: Track; shares: Record<BandName, Float32Array>; frames: number }[] = [];
  let framesAnalyzed = 0;

  for (const track of audible) {
    const rendered = await renderMasterBounce({ tracks, bpm, chain, bars, onlyTrackIds: [track.id], tailSeconds: 0.5 });
    if (rendered.eventsRendered === 0) continue;
    const mono = toMono(rendered.buffer);
    const { shares, frames } = bandActivity(mono, rendered.sampleRate);
    framesAnalyzed = Math.max(framesAnalyzed, frames);
    perTrack.push({ track, shares, frames });
  }

  if (perTrack.length < 2) {
    return { findings: [], tracksAnalyzed: perTrack.length, framesAnalyzed, emptyReason: 'Not enough audible tracks to compare.' };
  }

  const findings: MaskingFinding[] = [];
  for (let i = 0; i < perTrack.length; i++) {
    for (let j = i + 1; j < perTrack.length; j++) {
      const a = perTrack[i];
      const b = perTrack[j];
      const frames = Math.min(a.frames, b.frames);
      if (frames === 0) continue;

      for (const band of BAND_NAMES) {
        let both = 0;
        let aSum = 0;
        let bSum = 0;
        for (let f = 0; f < frames; f++) {
          const av = a.shares[band][f];
          const bv = b.shares[band][f];
          if (av >= ACTIVE_SHARE && bv >= ACTIVE_SHARE) {
            both++;
            aSum += av;
            bSum += bv;
          }
        }
        const overlapRatio = both / frames;
        if (overlapRatio < MIN_OVERLAP_FRAMES) continue;

        const aShare = aSum / both;
        const bShare = bSum / both;
        findings.push({
          trackAId: a.track.id,
          trackAName: a.track.name,
          trackBId: b.track.id,
          trackBName: b.track.name,
          band,
          centerHz: bandCenter(band),
          overlapRatio,
          aShare,
          bShare,
          // The track with less of its energy in the contested band is the one
          // getting covered.
          maskedTrackId: aShare < bShare ? a.track.id : b.track.id,
        });
      }
    }
  }

  findings.sort((x, y) => y.overlapRatio - x.overlapRatio);
  return { findings: findings.slice(0, 6), tracksAnalyzed: perTrack.length, framesAnalyzed };
}
