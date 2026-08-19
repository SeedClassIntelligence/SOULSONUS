/**
 * Real auditions for the vocal suite.
 *
 * Four AUDITION buttons in this app used to be `setState(true)` followed by a
 * `setTimeout` back to false: three seconds of a glowing label and no audio
 * node anywhere. Each function here builds an actual Tone graph and plays the
 * setting the creator is looking at, then disposes what it made.
 *
 * Where a genuine audition is not possible — a comp segment whose take has no
 * audio behind it — nothing here pretends. `isPlayableAudioSource` lets the UI
 * disable the control and say why instead.
 */

import * as Tone from 'tone';
import type { VocalCharacterType } from '../types/daw';

export interface AuditionHandle {
  /** Cut the audition short and dispose everything it built. */
  stop: () => void;
  /** Resolves when the audition has finished playing and disposed itself. */
  finished: Promise<void>;
  /** How many voices were actually triggered. Zero means nothing was audible. */
  voices: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Semitone offset of a key name from C, ignoring octave. Unknown keys fall to C. */
export function keyToSemitone(key: string): number {
  const cleaned = key.trim().replace(/\s*(maj|min|major|minor)\w*$/i, '');
  const flat = cleaned.replace(/^([A-G])b/i, (_m, letter: string) => {
    const idx = NOTE_NAMES.indexOf(letter.toUpperCase());
    return NOTE_NAMES[(idx + 11) % 12];
  });
  const normalized = flat.charAt(0).toUpperCase() + flat.slice(1);
  const idx = NOTE_NAMES.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

export function semitoneToNote(semitone: number, octave = 4): string {
  const total = semitone + octave * 12;
  const pitch = ((total % 12) + 12) % 12;
  const oct = Math.floor(total / 12);
  return `${NOTE_NAMES[pitch]}${oct}`;
}

export type HarmonyInterval = 'third_above' | 'third_below' | 'fifth' | 'octave' | 'double';

/** Semitones the harmony voice sits from the root, given the scale's third quality. */
export function harmonyOffsetSemitones(interval: HarmonyInterval, scale: string): number {
  const third = /min/i.test(scale) ? 3 : 4;
  switch (interval) {
    case 'third_above':
      return third;
    case 'third_below':
      return -third;
    case 'fifth':
      return 7;
    case 'octave':
      return 12;
    case 'double':
      return 0;
  }
}

/** A blob, data or http URL can be played. A synthetic asset id cannot. */
export function isPlayableAudioSource(source: string | undefined | null): boolean {
  if (!source) return false;
  return /^(blob:|data:audio|https?:|\/)/i.test(source);
}

function disposeAll(nodes: { dispose: () => void }[]): void {
  for (const node of nodes) {
    try {
      node.dispose();
    } catch {
      /* a node disposed twice is not worth failing an audition over */
    }
  }
}

function handleFor(nodes: { dispose: () => void }[], seconds: number, voices: number): AuditionHandle {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let settle: () => void = () => {};
  const finished = new Promise<void>((resolve) => {
    settle = resolve;
  });

  const cleanup = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    disposeAll(nodes);
    settle();
  };

  timer = setTimeout(cleanup, Math.max(0, seconds) * 1000 + 400);
  return { stop: cleanup, finished, voices };
}

/**
 * Plays the cadence exactly as the 16th-note grid draws it: one articulation
 * per syllable at its own subdivision, accented syllables louder and brighter,
 * with a quiet pulse on the four downbeats so the rhythm is legible against
 * the beat. Nothing is scheduled for an empty slot.
 */
export async function auditionCadence(options: {
  syllables: { index: number; emphasized: boolean }[];
  bpm: number;
  countPulse?: boolean;
}): Promise<AuditionHandle> {
  const { syllables, bpm, countPulse = true } = options;
  await Tone.start();

  const sixteenth = 60 / Math.max(20, bpm) / 4;
  const out = new Tone.Gain(1).toDestination();

  // A band-passed noise burst reads as a syllable far better than a pitched
  // blip does — it is the consonant, not a note.
  const shaper = new Tone.Filter({ type: 'bandpass', frequency: 1400, Q: 1.2 }).connect(out);
  const voice = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.002, decay: 0.09, sustain: 0 },
  }).connect(shaper);
  const accent = new Tone.Filter({ type: 'bandpass', frequency: 2600, Q: 1.0 }).connect(out);
  const accentVoice = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.13, sustain: 0 },
  }).connect(accent);
  const pulse = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.05 },
    volume: -22,
  }).connect(out);

  const start = Tone.now() + 0.08;
  let voices = 0;
  let last = 0;

  if (countPulse) {
    for (let beat = 0; beat < 4; beat++) {
      pulse.triggerAttackRelease('C2', 0.05, start + beat * sixteenth * 4);
      voices++;
    }
  }

  for (const syllable of syllables) {
    const at = start + syllable.index * sixteenth;
    if (syllable.emphasized) {
      accentVoice.triggerAttackRelease(0.13, at, 0.95);
    } else {
      voice.triggerAttackRelease(0.09, at, 0.45);
    }
    voices++;
    last = Math.max(last, syllable.index * sixteenth);
  }

  const span = Math.max(last, countPulse ? sixteenth * 16 : 0) + 0.4;
  return handleFor([voice, accentVoice, shaper, accent, pulse, out], span, voices);
}

/**
 * Plays the harmony candidate against its root, in the track's own key and
 * scale, with the humanize detune and stereo spread the panel is set to — so
 * a third above in a minor key sounds minor, and a double actually widens.
 */
export async function auditionHarmony(options: {
  key: string;
  scale: string;
  interval: HarmonyInterval;
  humanizeCents?: number;
  stereoSpread?: number;
  seconds?: number;
}): Promise<AuditionHandle> {
  const { key, scale, interval, humanizeCents = 0, stereoSpread = 0, seconds = 1.8 } = options;
  await Tone.start();

  const rootSemitone = keyToSemitone(key);
  const offset = harmonyOffsetSemitones(interval, scale);
  const spread = Math.max(0, Math.min(100, stereoSpread)) / 100;

  const out = new Tone.Gain(0.7).toDestination();
  const voiceOptions = {
    oscillator: { type: 'sawtooth' as const },
    envelope: { attack: 0.06, decay: 0.2, sustain: 0.7, release: 0.5 },
  };

  const nodes: { dispose: () => void }[] = [out];
  let voices = 0;

  const addVoice = (note: string, cents: number, pan: number, volume: number) => {
    const panner = new Tone.Panner(Math.max(-1, Math.min(1, pan))).connect(out);
    const tone = new Tone.Filter({ type: 'lowpass', frequency: 2600 }).connect(panner);
    const synth = new Tone.Synth({ ...voiceOptions, detune: cents, volume }).connect(tone);
    synth.triggerAttackRelease(note, seconds, Tone.now() + 0.05);
    nodes.push(synth, tone, panner);
    voices++;
  };

  const root = semitoneToNote(rootSemitone, 4);

  if (interval === 'double') {
    // A double is the same note twice, pulled apart by detune and position.
    addVoice(root, -humanizeCents, -spread, -8);
    addVoice(root, humanizeCents, spread, -8);
  } else {
    addVoice(root, 0, -spread * 0.35, -9);
    addVoice(semitoneToNote(rootSemitone + offset, 4), humanizeCents, spread, -11);
  }

  return handleFor(nodes, seconds + 0.6, voices);
}

/**
 * What each vocal character actually means in numbers.
 *
 * The ten character chips used to set a label and nothing else, so RASPY and
 * SMOOTH produced identical settings and would have auditioned identically.
 * Each preset follows the description the chip already showed the creator.
 */
export const CHARACTER_PRESETS: Record<VocalCharacterType, Required<VoiceCharacterAuditionSettings>> = {
  warm: { breathiness: 18, intimacy: 60, grit: 12, formantShift: -1, airShelf: 0 },
  airy: { breathiness: 45, intimacy: 40, grit: 4, formantShift: 1, airShelf: 6 },
  raspy: { breathiness: 30, intimacy: 55, grit: 62, formantShift: 0, airShelf: 2 },
  intimate: { breathiness: 30, intimacy: 90, grit: 8, formantShift: 0, airShelf: 3 },
  powerful: { breathiness: 10, intimacy: 45, grit: 28, formantShift: -1, airShelf: 2 },
  breathy: { breathiness: 70, intimacy: 65, grit: 4, formantShift: 1, airShelf: 4 },
  falsetto: { breathiness: 40, intimacy: 50, grit: 6, formantShift: 3, airShelf: 5 },
  gritty: { breathiness: 20, intimacy: 45, grit: 80, formantShift: -1, airShelf: 1 },
  smooth: { breathiness: 15, intimacy: 60, grit: 2, formantShift: 0, airShelf: 1 },
  choir_stacked: { breathiness: 35, intimacy: 35, grit: 6, formantShift: 0, airShelf: 4 },
};

export interface VoiceCharacterAuditionSettings {
  breathiness?: number;
  grit?: number;
  airShelf?: number;
  formantShift?: number;
  intimacy?: number;
}

/**
 * Runs a source through the character settings so the sliders can be heard.
 * The source is the track's own recorded take when one has audio behind it,
 * and a synthesized vowel when it does not — the caller is told which, so the
 * panel can label it honestly rather than implying a vocal was processed.
 */
export async function auditionVoiceCharacter(options: {
  settings: VoiceCharacterAuditionSettings;
  sourceUrl?: string | null;
  key?: string;
  seconds?: number;
}): Promise<AuditionHandle & { source: 'take' | 'synthetic' }> {
  const { settings, sourceUrl, key = 'C', seconds = 2.4 } = options;
  await Tone.start();

  const breathiness = Math.max(0, Math.min(100, settings.breathiness ?? 0)) / 100;
  const grit = Math.max(0, Math.min(100, settings.grit ?? 0)) / 100;
  const intimacy = Math.max(0, Math.min(100, settings.intimacy ?? 0)) / 100;
  const airShelf = settings.airShelf ?? 0;
  const formantShift = settings.formantShift ?? 0;

  const out = new Tone.Gain(0.8).toDestination();
  const air = new Tone.Filter({ type: 'highshelf', frequency: 9000, gain: airShelf }).connect(out);
  // Intimacy is proximity: a close mic lifts the low mids and stays dry.
  const proximity = new Tone.Filter({ type: 'lowshelf', frequency: 220, gain: intimacy * 5 }).connect(air);
  const drive = new Tone.Distortion({ distortion: grit * 0.55, wet: grit }).connect(proximity);
  // Formant shift moves the vowel resonances, not the pitch.
  const formantRatio = Math.pow(2, formantShift / 12);
  const formantOne = new Tone.Filter({ type: 'peaking', frequency: 700 * formantRatio, Q: 3, gain: 6 }).connect(drive);
  const formantTwo = new Tone.Filter({ type: 'peaking', frequency: 1900 * formantRatio, Q: 3, gain: 4 }).connect(formantOne);

  const nodes: { dispose: () => void }[] = [out, air, proximity, drive, formantOne, formantTwo];
  let voices = 0;
  let source: 'take' | 'synthetic' = 'synthetic';
  let span = seconds;

  if (isPlayableAudioSource(sourceUrl)) {
    const player = new Tone.Player({ url: sourceUrl as string, autostart: false }).connect(formantTwo);
    nodes.push(player);
    try {
      await Tone.loaded();
      player.start(Tone.now() + 0.05);
      span = Math.min(seconds, player.buffer?.duration || seconds);
      source = 'take';
      voices++;
    } catch {
      // A take whose blob has been revoked falls back to the synthetic vowel
      // rather than playing silence and calling it an audition.
      source = 'synthetic';
    }
  }

  if (source === 'synthetic') {
    const synth = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.08, decay: 0.3, sustain: 0.75, release: 0.6 },
      volume: -10,
    }).connect(formantTwo);
    synth.triggerAttackRelease(semitoneToNote(keyToSemitone(key), 3), seconds, Tone.now() + 0.05);
    nodes.push(synth);
    voices++;
  }

  if (breathiness > 0.01) {
    const breathBand = new Tone.Filter({ type: 'bandpass', frequency: 4200, Q: 0.7 }).connect(proximity);
    const breath = new Tone.Noise({ type: 'pink', volume: -34 + breathiness * 18 }).connect(breathBand);
    breath.start(Tone.now() + 0.05).stop(Tone.now() + 0.05 + span);
    nodes.push(breath, breathBand);
    voices++;
  }

  const handle = handleFor(nodes, span + 0.6, voices);
  return { ...handle, source };
}

/**
 * Plays the slice of a take that a comp segment actually points at. Only
 * callable when the take carries real audio; the panel checks first.
 */
export async function auditionCompSegment(options: {
  sourceUrl: string;
  sourceStart?: number;
  sourceEnd?: number;
  gainTrimDb?: number;
}): Promise<AuditionHandle> {
  const { sourceUrl, sourceStart = 0, sourceEnd, gainTrimDb = 0 } = options;
  await Tone.start();

  const out = new Tone.Gain(1).toDestination();
  const trim = new Tone.Volume(gainTrimDb).connect(out);
  const player = new Tone.Player({ url: sourceUrl, autostart: false }).connect(trim);
  await Tone.loaded();

  const bufferSeconds = player.buffer?.duration ?? 0;
  const start = Math.max(0, Math.min(sourceStart, bufferSeconds));
  const end = sourceEnd !== undefined ? Math.min(sourceEnd, bufferSeconds) : bufferSeconds;
  const span = Math.max(0.05, end - start);

  player.start(Tone.now() + 0.05, start, span);
  return handleFor([player, trim, out], span + 0.3, 1);
}

export interface CompSegmentAudition {
  sourceUrl: string;
  sourceStart?: number;
  sourceEnd?: number;
  gainTrimDb?: number;
}

/**
 * Plays a comp end to end: each segment's slice of its own take, in order,
 * butted together with the crossfade the panel is set to. Only segments whose
 * take carries real audio can be included — the caller filters first, so a comp
 * built entirely from preset takes is refused rather than mimed.
 */
export async function auditionCompSequence(options: {
  segments: CompSegmentAudition[];
  crossfadeMs?: number;
}): Promise<AuditionHandle> {
  const { segments, crossfadeMs = 0 } = options;
  await Tone.start();

  const out = new Tone.Gain(1).toDestination();
  const nodes: { dispose: () => void }[] = [out];
  const crossfade = Math.max(0, crossfadeMs) / 1000;

  const players = segments.map((segment) => {
    const trim = new Tone.Volume(segment.gainTrimDb ?? 0).connect(out);
    const player = new Tone.Player({ url: segment.sourceUrl, autostart: false }).connect(trim);
    player.fadeIn = crossfade;
    player.fadeOut = crossfade;
    nodes.push(player, trim);
    return { player, segment };
  });

  await Tone.loaded();

  let cursor = Tone.now() + 0.08;
  let voices = 0;
  for (const { player, segment } of players) {
    const bufferSeconds = player.buffer?.duration ?? 0;
    if (bufferSeconds <= 0) continue;
    const start = Math.max(0, Math.min(segment.sourceStart ?? 0, bufferSeconds));
    const end = segment.sourceEnd !== undefined ? Math.min(segment.sourceEnd, bufferSeconds) : bufferSeconds;
    const span = Math.max(0.05, end - start);
    player.start(cursor, start, span);
    cursor += Math.max(0.05, span - crossfade);
    voices++;
  }

  return handleFor(nodes, cursor - Tone.now() + 0.3, voices);
}
