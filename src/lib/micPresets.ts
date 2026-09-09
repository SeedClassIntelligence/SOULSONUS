/**
 * Microphone presets, as settings rather than adjectives.
 *
 * The creator asked for these by name -- Warm Vocal, Rap Presence, Intimate --
 * and a name over nothing is what this project keeps having to remove. So each
 * one is a real set of values written onto the armed channel's DSP, which the
 * mixer and the bounce both honour (test-29 proves an EQ move reaches live
 * playback and the exported file), plus the input gain the capture engine uses.
 * Every preset states its own numbers on screen, so a creator can see what
 * "warm" meant here rather than trust the word.
 *
 * Raw / Dry is not an absence of a preset. It is the preset that applies
 * nothing, stated as such.
 */
import type { TrackDspSettings } from '../types/daw';

export interface MicPreset {
  id: string;
  name: string;
  /** The three words the surface shows, and they have to be earned by the values. */
  says: string;
  /** Input amplification the capture engine runs at, 1x-5x. */
  gain: number;
  dsp: TrackDspSettings;
}

const summarise = (dsp: TrackDspSettings): string => {
  const parts: string[] = [];
  if (dsp.lowCutHz) parts.push(`low cut ${dsp.lowCutHz} Hz`);
  if (dsp.lowGain) parts.push(`${dsp.lowGain > 0 ? '+' : ''}${dsp.lowGain} dB low`);
  if (dsp.midGain) parts.push(`${dsp.midGain > 0 ? '+' : ''}${dsp.midGain} dB at ${dsp.midFreqHz} Hz`);
  if (dsp.highGain) parts.push(`${dsp.highGain > 0 ? '+' : ''}${dsp.highGain} dB air`);
  if (dsp.compressorRatio && dsp.compressorRatio > 1)
    parts.push(`${dsp.compressorRatio}:1 at ${dsp.compressorThreshold} dB`);
  return parts.length ? parts.join(' · ') : 'nothing applied';
};

const make = (id: string, name: string, says: string, gain: number, dsp: TrackDspSettings): MicPreset => ({
  id, name, says, gain, dsp,
});

export const MIC_PRESETS: MicPreset[] = [
  make('studio_vocal', 'Studio Vocal', 'Neutral · Full · Present', 1.6, {
    lowCutHz: 80, midFreqHz: 3000, midGain: 1.5, midQ: 1, highGain: 1,
    compressorThreshold: -18, compressorRatio: 3,
  }),
  make('warm_vocal', 'Warm Vocal', 'Warm · Clean · Intimate', 1.6, {
    lowCutHz: 90, lowGain: 2, midFreqHz: 400, midGain: 1, midQ: 0.9, highGain: -1.5,
    compressorThreshold: -20, compressorRatio: 3.5,
  }),
  make('bright_vocal', 'Bright Vocal', 'Open · Airy · Forward', 1.6, {
    lowCutHz: 100, midFreqHz: 5000, midGain: 2, midQ: 1.2, highGain: 3.5,
    compressorThreshold: -18, compressorRatio: 3,
  }),
  make('rap_presence', 'Rap Presence', 'Tight · Upfront · Controlled', 1.8, {
    lowCutHz: 110, midFreqHz: 2000, midGain: 2.5, midQ: 1.1, highGain: 1.5,
    compressorThreshold: -16, compressorRatio: 5,
  }),
  make('intimate', 'Intimate', 'Close · Soft · Unhurried', 1.4, {
    lowCutHz: 70, lowGain: 1.5, midFreqHz: 900, midGain: -1, midQ: 0.8, highGain: -0.5,
    compressorThreshold: -24, compressorRatio: 2.5,
  }),
  make('raw_dry', 'Raw / Dry', 'Nothing added · As performed', 1.5, {}),
  make('podcast', 'Podcast / Spoken', 'Even · Legible · Steady', 1.7, {
    lowCutHz: 100, midFreqHz: 1500, midGain: 1.5, midQ: 1, highGain: 0.5,
    compressorThreshold: -20, compressorRatio: 4,
  }),
];

export const describePreset = (p: MicPreset): string => summarise(p.dsp);

export const presetById = (id: string): MicPreset =>
  MIC_PRESETS.find((p) => p.id === id) || MIC_PRESETS[1];
