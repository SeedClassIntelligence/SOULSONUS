/**
 * The per-track channel strip's EQ and dynamics, built once and used by both
 * live playback and the offline bounce.
 *
 * The Mix room and the Vocal DSP tab have always written `lowGain`, `midGain`,
 * `highGain`, `lowCutHz`, `midFreqHz`, `midQ` and `delaySend` into track state.
 * Nothing read them: the live strip was a single filter, a compressor and a
 * channel, so seven of the controls on the channel workstation moved numbers
 * and no audio. These bands are those controls.
 */

import * as Tone from 'tone';
import { Track, TrackDspSettings } from '../types/daw';
import { defaultFilterFreqFor } from './instrumentVoices';

/** Fixed corner frequencies, matching the labels the mix panel already shows. */
export const LOW_SHELF_HZ = 100;
export const HIGH_SHELF_HZ = 10000;
export const DEFAULT_MID_HZ = 1200;
export const DEFAULT_MID_Q = 1;
export const DEFAULT_LOW_CUT_HZ = 20;

export interface TrackStrip {
  /** Feed the instrument into this. */
  input: Tone.ToneAudioNode;
  /** Take the processed signal from here. */
  output: Tone.ToneAudioNode;
  /** Re-applies settings without rebuilding the graph. */
  update: (dsp: TrackDspSettings | undefined, instrument: Track['instrument']) => void;
  dispose: () => void;
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && isFinite(v) ? v : fallback);

/** What a track sounds like before anyone touches a control. */
export function defaultTrackDsp(track: Track): TrackDspSettings {
  return {
    filterFreq: defaultFilterFreqFor(track.instrument),
    filterType: 'lowpass',
    lowCutHz: DEFAULT_LOW_CUT_HZ,
    lowGain: 0,
    midFreqHz: DEFAULT_MID_HZ,
    midQ: DEFAULT_MID_Q,
    midGain: 0,
    highGain: 0,
    compressorThreshold: -18,
    compressorRatio: 4,
    reverbSend: track.instrument === 'melody' ? 0.25 : 0,
    delaySend: 0,
    pan: 0,
    volume: track.volume || 0,
  };
}

/**
 * Low cut → low shelf → parametric mid → high shelf → character filter →
 * compressor. The character filter and compressor were already here; the four
 * EQ stages in front of them are what the controls were missing.
 */
export function buildTrackStrip(dsp: TrackDspSettings | undefined, instrument: Track['instrument']): TrackStrip {
  const lowCut = new Tone.Filter({ type: 'highpass', frequency: num(dsp?.lowCutHz, DEFAULT_LOW_CUT_HZ), rolloff: -12 });
  const lowShelf = new Tone.Filter({ type: 'lowshelf', frequency: LOW_SHELF_HZ, gain: num(dsp?.lowGain, 0) });
  const midPeak = new Tone.Filter({
    type: 'peaking',
    frequency: num(dsp?.midFreqHz, DEFAULT_MID_HZ),
    Q: num(dsp?.midQ, DEFAULT_MID_Q),
    gain: num(dsp?.midGain, 0),
  });
  const highShelf = new Tone.Filter({ type: 'highshelf', frequency: HIGH_SHELF_HZ, gain: num(dsp?.highGain, 0) });
  const filter = new Tone.Filter({
    frequency: num(dsp?.filterFreq, defaultFilterFreqFor(instrument)),
    type: dsp?.filterType || 'lowpass',
  });
  const compressor = new Tone.Compressor({
    threshold: num(dsp?.compressorThreshold, -18),
    ratio: num(dsp?.compressorRatio, 4),
    attack: 0.005,
    release: 0.1,
  });

  lowCut.connect(lowShelf);
  lowShelf.connect(midPeak);
  midPeak.connect(highShelf);
  highShelf.connect(filter);
  filter.connect(compressor);

  const update = (next: TrackDspSettings | undefined, inst: Track['instrument']) => {
    lowCut.frequency.value = num(next?.lowCutHz, DEFAULT_LOW_CUT_HZ);
    lowShelf.gain.value = num(next?.lowGain, 0);
    midPeak.frequency.value = num(next?.midFreqHz, DEFAULT_MID_HZ);
    midPeak.Q.value = num(next?.midQ, DEFAULT_MID_Q);
    midPeak.gain.value = num(next?.midGain, 0);
    highShelf.gain.value = num(next?.highGain, 0);
    filter.frequency.value = num(next?.filterFreq, defaultFilterFreqFor(inst));
    filter.type = next?.filterType || 'lowpass';
    compressor.threshold.value = num(next?.compressorThreshold, -18);
    compressor.ratio.value = num(next?.compressorRatio, 4);
  };

  return {
    input: lowCut,
    output: compressor,
    update,
    dispose: () => {
      [lowCut, lowShelf, midPeak, highShelf, filter, compressor].forEach((n) => {
        try { n.dispose(); } catch { /* already disposed */ }
      });
    },
  };
}
