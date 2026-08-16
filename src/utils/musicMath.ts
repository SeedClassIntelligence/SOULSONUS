/**
 * SoulSonus Music Mathematics & Pitch Utilities
 * Standard: 480 PPQ (Pulses/Ticks Per Quarter Note)
 * 1 Quarter Note = 480 ticks
 * 1 16th Note = 120 ticks
 * 1 Bar (4/4) = 1920 ticks
 * 4 Bars (64 Steps) = 7680 ticks
 */

import { NoteEvent } from '../types/daw';

export const PPQ = 480;
export const TICKS_PER_16TH = 120;
export const TICKS_PER_BEAT = 480;
export const TICKS_PER_BAR = 1920;
export const TICKS_PER_4_BARS = 7680;
export const TOTAL_STEPS = 64;

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Converts a MIDI note number (0..127) to standard note name string (e.g. 60 -> "C4", 61 -> "C#4")
 */
export function midiToNoteName(midi: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(midi)));
  const octave = Math.floor(clamped / 12) - 1;
  const noteIndex = clamped % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Converts note name string (e.g. "C4", "F#3", "Bb2") to MIDI note number (0..127)
 */
export function noteNameToMidi(name: string): number {
  if (!name) return 60;
  const clean = name.trim().toUpperCase();
  const match = clean.match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return 60;

  let note = match[1];
  const octave = parseInt(match[2], 10);

  // Normalize flat to sharp
  if (note === 'DB') note = 'C#';
  else if (note === 'EB') note = 'D#';
  else if (note === 'GB') note = 'F#';
  else if (note === 'AB') note = 'G#';
  else if (note === 'BB') note = 'A#';

  const noteIndex = NOTE_NAMES.indexOf(note as any);
  if (noteIndex === -1) return 60;

  return (octave + 1) * 12 + noteIndex;
}

/**
 * Converts MIDI note to fundamental frequency in Hz (A4 = 440Hz)
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converts high-resolution ticks to exact seconds at the current BPM
 */
export function ticksToSeconds(ticks: number, bpm: number): number {
  const safeBpm = Math.max(20, Math.min(300, bpm || 110));
  const beats = ticks / PPQ;
  return (beats * 60) / safeBpm;
}

/**
 * Converts seconds to high-resolution ticks at the current BPM
 */
export function secondsToTicks(seconds: number, bpm: number): number {
  const safeBpm = Math.max(20, Math.min(300, bpm || 110));
  const beats = (seconds * safeBpm) / 60;
  return Math.round(beats * PPQ);
}

/**
 * Converts step index (0..63) to tick offset
 */
export function stepToTick(step: number): number {
  return step * TICKS_PER_16TH;
}

/**
 * Converts tick offset to closest step index (0..63)
 */
export function tickToStep(tick: number): number {
  return Math.max(0, Math.min(TOTAL_STEPS - 1, Math.floor(tick / TICKS_PER_16TH)));
}

/**
 * Snaps a tick position to the specified grid division in ticks
 * (e.g. 120 for 16th, 240 for 8th, 480 for quarter)
 */
export function snapTick(tick: number, divisionTicks: number = TICKS_PER_16TH): number {
  if (divisionTicks <= 0) return Math.max(0, Math.min(TICKS_PER_4_BARS, tick));
  const snapped = Math.round(tick / divisionTicks) * divisionTicks;
  return Math.max(0, Math.min(TICKS_PER_4_BARS, snapped));
}

/**
 * Scale intervals in semitones relative to root
 */
export const SCALE_INTERVALS: Record<string, number[]> = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

/**
 * Checks if a MIDI note is inside a specific musical key and scale
 */
export function isNoteInScale(midi: number, rootKey: string = 'C', scale: string = 'minor'): boolean {
  const rootIndex = NOTE_NAMES.indexOf(rootKey.toUpperCase() as any);
  if (rootIndex === -1) return true;
  const intervals = SCALE_INTERVALS[scale.toLowerCase()] || SCALE_INTERVALS.minor;
  const notePitchClass = midi % 12;
  const relativePitchClass = (notePitchClass - rootIndex + 12) % 12;
  return intervals.includes(relativePitchClass);
}

/**
 * Snaps a MIDI pitch to the closest note in the specified scale
 */
export function snapMidiToScale(midi: number, rootKey: string = 'C', scale: string = 'minor'): number {
  if (isNoteInScale(midi, rootKey, scale)) return midi;
  // Check +1, -1, +2, -2
  for (let offset = 1; offset <= 6; offset++) {
    if (isNoteInScale(midi + offset, rootKey, scale)) return midi + offset;
    if (isNoteInScale(midi - offset, rootKey, scale)) return midi - offset;
  }
  return midi;
}

/**
 * Derives a 64-boolean step array from NoteEvents for fast grid rendering or drum views
 */
export function deriveStepArrayFromNoteEvents(events: NoteEvent[] = []): boolean[] {
  const steps = Array(TOTAL_STEPS).fill(false);
  events.forEach((ev) => {
    const startStep = tickToStep(ev.startTick);
    const endStep = tickToStep(ev.startTick + Math.max(1, ev.durationTicks - 1));
    for (let s = startStep; s <= endStep && s < TOTAL_STEPS; s++) {
      steps[s] = true;
    }
  });
  return steps;
}

/**
 * Converts a legacy 64-boolean step array into structured NoteEvents
 */
export function convertStepsToNoteEvents(
  steps: boolean[] = [],
  basePitch: string = 'C3',
  notesArray?: string[],
  velocitiesArray?: number[]
): NoteEvent[] {
  const events: NoteEvent[] = [];
  const defaultMidi = noteNameToMidi(basePitch);

  let i = 0;
  while (i < steps.length && i < TOTAL_STEPS) {
    if (steps[i]) {
      const startStep = i;
      const pitchName = notesArray?.[i] || basePitch;
      const midi = noteNameToMidi(pitchName);
      const vel = velocitiesArray?.[i] ?? 100;

      // Count consecutive active steps to determine duration if continuous
      let durationSteps = 1;
      // In 16th grid, single step is 120 ticks
      events.push({
        id: `note_${Date.now()}_${startStep}_${midi}`,
        startTick: stepToTick(startStep),
        durationTicks: durationSteps * TICKS_PER_16TH,
        midiNote: midi,
        velocity: vel,
        provenance: {
          origin: 'MANUAL',
          creatorEdited: false,
        },
      });
    }
    i++;
  }
  return events;
}
