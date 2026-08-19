/**
 * Synth definitions shared by live playback and the offline bounce.
 *
 * Both paths must build the same voices from the same numbers, or a bounce
 * would measure and export something the creator never heard.
 */

import * as Tone from 'tone';
import { InstrumentParameters, Track } from '../types/daw';

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


/**
 * Applies a track's instrument parameters to the voice about to play it.
 *
 * These twelve controls existed in the workstation from the beginning and
 * `Track.instrumentParams` was read by no file in this directory, so every one
 * of them wrote a number and changed nothing. The voices are shared per
 * instrument and routed per track at trigger time -- that is the engine's
 * existing design -- so the parameters are applied the same way, immediately
 * before the note sounds.
 *
 * Where a control has no defensible target on a given voice it is left alone
 * rather than mapped to something adjacent, and the panel hides it. A slider
 * that moves a value nobody asked it to move is not better than one that does
 * nothing; it is worse, because it is harder to notice.
 */
export type InstrumentVoice =
  | Tone.MembraneSynth
  | Tone.NoiseSynth
  | Tone.MetalSynth
  | Tone.FMSynth
  | Tone.MonoSynth;

/** Applies a track's parameters to one voice. */
export function applyParamsToVoice(voice: InstrumentVoice, track: Track): void {
  const p = track.instrumentParams;
  if (!p) return;
  const ms = (v: number | undefined, fallback: number) =>
    typeof v === 'number' && isFinite(v) ? Math.max(0.001, v / 1000) : fallback;
  const pct = (v: number | undefined, fallback: number) =>
    typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v / 100)) : fallback;

  switch (track.instrument) {
    case 'kick': {
      if (!(voice instanceof Tone.MembraneSynth)) return;
      const v = voice;
      v.envelope.attack = ms(p.attack, 0.001);
      v.envelope.decay = ms(p.decay, 0.4);
      v.envelope.sustain = pct(p.sustain, 0.01);
      v.envelope.release = ms(p.release, 0.4);
      // Sub weight is how far the pitch sweep reaches down, which is what
      // gives a membrane kick its body.
      if (typeof p.subWeight === 'number') {
        v.octaves = Math.max(1, Math.min(12, 8 + p.subWeight));
      }
      if (typeof p.timbreBrightness === 'number') {
        // A faster pitch decay leaves more click and less boom.
        v.pitchDecay = 0.01 + (1 - pct(p.timbreBrightness, 0.45)) * 0.14;
      }
      break;
    }
    case 'snare': {
      if (!(voice instanceof Tone.NoiseSynth)) return;
      const v = voice;
      v.envelope.attack = ms(p.attack, 0.001);
      v.envelope.decay = ms(p.decay, 0.2);
      v.envelope.sustain = pct(p.sustain, 0);
      v.envelope.release = ms(p.release, 0.1);
      if (typeof p.timbreBrightness === 'number') {
        // Pink noise is darker than white; brown darker still.
        const b = pct(p.timbreBrightness, 0.45);
        v.noise.type = b > 0.66 ? 'white' : b > 0.33 ? 'pink' : 'brown';
      }
      break;
    }
    case 'hihat': {
      if (!(voice instanceof Tone.MetalSynth)) return;
      const v = voice;
      v.envelope.attack = ms(p.attack, 0.001);
      v.envelope.decay = ms(p.decay, 0.05);
      v.envelope.release = ms(p.release, 0.05);
      if (typeof p.timbreBrightness === 'number') {
        v.harmonicity = 1 + pct(p.timbreBrightness, 0.45) * 12;
      }
      break;
    }
    case 'bass': {
      if (!(voice instanceof Tone.MonoSynth)) return;
      const v = voice;
      v.envelope.attack = ms(p.attack, 0.01);
      v.envelope.decay = ms(p.decay, 0.2);
      v.envelope.sustain = pct(p.sustain, 0.4);
      v.envelope.release = ms(p.release, 0.4);
      v.portamento = ms(p.glideTime, 0);
      // MonoSynth is the one voice with a filter of its own, so this is the
      // only instrument where the instrument filter is a real control. Every
      // other track's filter belongs to the channel strip.
      //
      // The cutoff goes to the filter *envelope's* base frequency, not to
      // `filter.frequency`. On a MonoSynth the envelope drives the filter on
      // every note, so a value written straight to the filter is overwritten
      // by the next attack -- which is exactly what happened: the control
      // moved from 12.4 kHz to 200 Hz and the render did not change by a
      // hundredth of a decibel.
      if (typeof p.filterCutoff === 'number') {
        v.filterEnvelope.baseFrequency = Math.max(20, Math.min(18000, p.filterCutoff));
      }
      if (typeof p.filterResonance === 'number') v.filter.Q.value = p.filterResonance;
      if (p.filterType) v.filter.type = p.filterType;
      // Sub weight is how many octaves the envelope sweeps above that corner:
      // more weight, less upward sweep, so more of the fundamental survives.
      if (typeof p.subWeight === 'number') {
        v.filterEnvelope.octaves = Math.max(0.5, Math.min(7, 4 - p.subWeight * 0.4));
      }
      break;
    }
    default: {
      if (!(voice instanceof Tone.FMSynth)) return;
      const v = voice;
      v.envelope.attack = ms(p.attack, 0.01);
      v.envelope.decay = ms(p.decay, 0.3);
      v.envelope.sustain = pct(p.sustain, 0.2);
      v.envelope.release = ms(p.release, 0.5);
      v.portamento = ms(p.glideTime, 0);
      if (typeof p.timbreBrightness === 'number') {
        // FM index is the brightness control on an FM voice.
        v.modulationIndex.value = 1 + pct(p.timbreBrightness, 0.45) * 30;
      }
      break;
    }
  }
}

/** Applies a track's parameters to whichever of the shared voices will play it. */
export function applyInstrumentParams(voices: InstrumentVoices, track: Track): void {
  const voice =
    track.instrument === 'kick'
      ? voices.kick
      : track.instrument === 'snare'
        ? voices.snare
        : track.instrument === 'hihat'
          ? voices.hihat
          : track.instrument === 'bass'
            ? voices.bass
            : voices.melody;
  applyParamsToVoice(voice, track);
}

/** Velocity after the track's expression control, which scales the whole track. */
export function expressiveVelocity(velocity: number, params?: InstrumentParameters): number {
  const e = params?.expression;
  if (typeof e !== 'number' || !isFinite(e)) return velocity;
  return Math.max(0.02, Math.min(1, velocity * (e / 100)));
}

/** Which of the twelve controls do something on this instrument. */
export const ACTIVE_PARAMS: Record<string, (keyof InstrumentParameters)[]> = {
  // `drive` is on every list because it drives the channel strip's
  // distortion, which every track has, rather than anything voice-specific.
  kick: ['attack', 'decay', 'sustain', 'release', 'subWeight', 'timbreBrightness', 'drive', 'expression'],
  snare: ['attack', 'decay', 'sustain', 'release', 'timbreBrightness', 'drive', 'expression'],
  hihat: ['attack', 'decay', 'release', 'timbreBrightness', 'drive', 'expression'],
  bass: [
    'attack', 'decay', 'sustain', 'release', 'glideTime',
    'filterCutoff', 'filterResonance', 'filterType', 'subWeight', 'drive', 'expression',
  ],
  melody: ['attack', 'decay', 'sustain', 'release', 'glideTime', 'timbreBrightness', 'drive', 'expression'],
};

/** Why a control is inactive, in the creator's terms. */
export const INACTIVE_REASON: Record<string, string> = {
  sustain: 'this voice has no sustain stage — it decays and stops',
  glideTime: 'glide needs a pitched, monophonic voice',
  filterCutoff: 'this voice has no filter of its own; use the channel filter',
  filterResonance: 'this voice has no filter of its own; use the channel filter',
  filterType: 'this voice has no filter of its own; use the channel filter',
  subWeight: 'nothing on this voice reaches into the sub',
  timbreBrightness: 'brightness is set by the channel filter on this voice',
};

export const paramIsActive = (instrument: string, key: keyof InstrumentParameters) =>
  (ACTIVE_PARAMS[instrument] || ACTIVE_PARAMS.melody).includes(key);
