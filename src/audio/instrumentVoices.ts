/**
 * Synth definitions shared by live playback and the offline bounce.
 *
 * Both paths must build the same voices from the same numbers, or a bounce
 * would measure and export something the creator never heard.
 */

import * as Tone from 'tone';

export const KICK_OPTIONS = {
  pitchDecay: 0.05,
  octaves: 8,
  oscillator: { type: 'sine' as const },
  envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4 },
};

export const SNARE_OPTIONS = {
  noise: { type: 'white' as const },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
};

export const HIHAT_OPTIONS = {
  envelope: { attack: 0.001, decay: 0.05, release: 0.05 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5,
  volume: -10,
};

export const HIHAT_FREQUENCY = 200;

export const MELODY_OPTIONS = {
  harmonicity: 3,
  modulationIndex: 10,
  detune: 0,
  oscillator: { type: 'sine' as const },
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 },
  modulation: { type: 'triangle' as const },
  modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 },
};

export const BASS_OPTIONS = {
  oscillator: { type: 'sawtooth' as const },
  filter: { Q: 3, type: 'lowpass' as const },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.4 },
  filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.2, baseFrequency: 80, octaves: 4 },
};

export interface InstrumentVoices {
  kick: Tone.MembraneSynth;
  snare: Tone.NoiseSynth;
  hihat: Tone.MetalSynth;
  melody: Tone.FMSynth;
  bass: Tone.MonoSynth;
}

/** Builds one set of voices in whichever Tone context is current. */
export function createInstrumentVoices(): InstrumentVoices {
  const hihat = new Tone.MetalSynth(HIHAT_OPTIONS);
  hihat.frequency.value = HIHAT_FREQUENCY;
  return {
    kick: new Tone.MembraneSynth(KICK_OPTIONS),
    snare: new Tone.NoiseSynth(SNARE_OPTIONS),
    hihat,
    melody: new Tone.FMSynth(MELODY_OPTIONS),
    bass: new Tone.MonoSynth(BASS_OPTIONS),
  };
}

/** Default per-track lowpass corner, mirroring the live channel strip. */
export function defaultFilterFreqFor(instrument: string): number {
  if (instrument === 'kick') return 400;
  if (instrument === 'bass') return 600;
  if (instrument === 'hihat') return 8000;
  return 12000;
}
