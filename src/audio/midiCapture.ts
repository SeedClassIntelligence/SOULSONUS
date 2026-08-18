/**
 * Maps incoming MIDI note events onto the same CaptureEvent the mic path emits,
 * so both go through one router and land on one channel each.
 *
 * There is no classification problem here and the spectral classifier is not
 * used: a MIDI note already states exactly what was played. The note number and
 * channel *are* the classification — this just names it in the shared taxonomy.
 */

import { CaptureEvent } from './detectionEngine';
import { PerformanceClass, freqToNoteName } from './performanceClassifier';

/** The MIDI channel reserved for percussion by General MIDI (1-indexed). */
export const GM_DRUM_CHANNEL = 10;

/**
 * General MIDI percussion key map, narrowed to the families this app separates.
 * Anything percussive outside these notes falls back by register.
 */
const GM_DRUM_MAP: Record<number, PerformanceClass> = {
  35: 'kick',   // Acoustic Bass Drum
  36: 'kick',   // Bass Drum 1
  37: 'snare',  // Side Stick
  38: 'snare',  // Acoustic Snare
  39: 'snare',  // Hand Clap
  40: 'snare',  // Electric Snare
  41: 'kick',   // Low Floor Tom
  42: 'hihat',  // Closed Hi-Hat
  43: 'kick',   // High Floor Tom
  44: 'hihat',  // Pedal Hi-Hat
  45: 'snare',  // Low Tom
  46: 'hihat',  // Open Hi-Hat
  47: 'snare',  // Low-Mid Tom
  48: 'snare',  // Hi-Mid Tom
  49: 'hihat',  // Crash Cymbal 1
  50: 'snare',  // High Tom
  51: 'hihat',  // Ride Cymbal 1
  52: 'hihat',  // Chinese Cymbal
  53: 'hihat',  // Ride Bell
  55: 'hihat',  // Splash Cymbal
  57: 'hihat',  // Crash Cymbal 2
  59: 'hihat',  // Ride Cymbal 2
};

/** Pitched notes at or below this split to the low-register channel (C3). */
export const MIDI_REGISTER_SPLIT = 48;

export interface MidiNoteInput {
  note: number;
  velocity: number;
  channel: number;
}

/** Names a MIDI note in the shared performance taxonomy. */
export function classifyMidiNote(input: MidiNoteInput): PerformanceClass {
  if (input.channel === GM_DRUM_CHANNEL) {
    const mapped = GM_DRUM_MAP[input.note];
    if (mapped) return mapped;
    // Unmapped percussion: place it by register within the kit.
    if (input.note <= 41) return 'kick';
    if (input.note >= 42 && input.note <= 51) return 'snare';
    return 'hihat';
  }
  return input.note < MIDI_REGISTER_SPLIT ? 'tonal_low' : 'tonal_high';
}

function midiToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/**
 * Builds a CaptureEvent from a MIDI note-on. Velocity is the performed MIDI
 * velocity, untouched — it is already the real thing and needs no estimation.
 */
export function midiNoteToCaptureEvent(input: MidiNoteInput): CaptureEvent {
  const klass = classifyMidiNote(input);
  const isPercussive = klass === 'kick' || klass === 'snare' || klass === 'hihat';
  const hz = midiToFrequency(input.note);

  return {
    klass,
    velocity: Math.max(1, Math.min(127, input.velocity)),
    // A MIDI note states its own identity, so there is nothing to be unsure about.
    confidence: 1,
    centroidHz: hz,
    pitchHz: isPercussive ? -1 : hz,
    pitch: isPercussive ? undefined : freqToNoteName(hz),
    midiNote: input.note,
    bands: { sub: 0, low: 0, lowMid: 0, mid: 0, high: 0, air: 0 },
    // Zero so calibrated-profile matching, which is a spectral test, never
    // claims a MIDI event. The GM map above is the authority for this path.
    bandPeak: 0,
    spectralEnergy: 0,
    rms: input.velocity / 127,
    // Null so the router falls through to instrument matching rather than
    // claiming the seed track a hum performance created.
    modality: null,
    atMs: Date.now(),
    source: 'MIDI',
  };
}
