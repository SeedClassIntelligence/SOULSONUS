/**
 * A performance treated as a lyric seed, not as failed speech recognition.
 *
 * SRT-1 VI separates two things the earlier thread had mixed: Mode A cleans
 * and structures words a creator actually said, and Mode B takes a performance
 * that carries "cadence and emotion but not complete lyrics" and treats it as
 * a seed. This is Mode B's half.
 *
 * What it derives is only what was measured. The onsets of a vocal take give
 * the syllabic rhythm; their velocities give the stress pattern; the gaps
 * between them give the phrases, and therefore where the rhyme positions are;
 * the tracked fundamental gives the melodic fit. That is five of the six
 * things the seed says Mode B should preserve.
 *
 * The sixth, theme, is not derived. Nothing in this build can infer what a
 * hummed line is about, and a theme invented here would be the studio putting
 * words in the creator's mouth at the exact moment it claims to be preserving
 * their intent. It comes from the creator, or it is absent and says so.
 *
 * Clause VI.4 and Amendment E.2 ask for four things to stay distinguishable,
 * and `LyricSourceKind` is where they are kept apart rather than flattened
 * into one list of "lyrics".
 */

import type { ExpressionState } from '../types/daw';
import { countLine, syllabify } from './syllables';

/**
 * The four kinds the seed insists are not the same thing.
 *
 *   WORD_RECOGNIZED    a word that was actually recognised in the take.
 *   PHONETIC_FRAGMENT  an utterance carrying cadence and no lexical content --
 *                      the "yeah nah... something..." of the seed's example.
 *   SYLLABLE_POSITION  a melodic position: a syllable was sung here, at this
 *                      pitch, and what it was is not known.
 *   SEMANTIC_INTENT    what the take is about. Never derived from the audio.
 */
export type LyricSourceKind =
  | 'WORD_RECOGNIZED'
  | 'PHONETIC_FRAGMENT'
  | 'SYLLABLE_POSITION'
  | 'SEMANTIC_INTENT';

export const SOURCE_KIND_LABEL: Record<LyricSourceKind, string> = {
  WORD_RECOGNIZED: 'word heard',
  PHONETIC_FRAGMENT: 'sound, no word',
  SYLLABLE_POSITION: 'sung position',
  SEMANTIC_INTENT: 'what it is about',
};

export interface SeedOnset {
  /** Seconds from the start of the take. */
  atSeconds: number;
  velocity: number;
  /** Fundamental in Hz, or -1/0 when the onset carried no pitch. */
  pitchHz?: number;
  /**
   * A word recognised at this position, when something recognised one.
   * Nothing in this build does yet, and a null here is the honest answer
   * rather than a placeholder.
   */
  word?: string | null;
}

export interface SyllablePosition {
  index: number;
  /** Musical position in ticks from the start of the take, at 480 PPQ. */
  startTick: number;
  atSeconds: number;
  /** How hard this one landed, against the phrase's own average. */
  stress: number;
  /** Above the phrase's own average by the margin below. Measured, not assumed. */
  stressed: boolean;
  /** The note sung here, when one was tracked. */
  midiNote: number | null;
  phrase: number;
  /** The last position of its phrase -- where a rhyme lands. */
  isRhymePosition: boolean;
  kind: LyricSourceKind;
  /** The recognised word, when there is one. Never invented. */
  word: string | null;
}

export interface SeedPhrase {
  index: number;
  syllableCount: number;
  startTick: number;
  endTick: number;
  /** '/' for a stressed position, 'x' for an unstressed one, in order. */
  stressPattern: string;
}

export interface LyricSeed {
  positions: SyllablePosition[];
  phrases: SeedPhrase[];
  /** What the creator said the take is about. Null until they say it. */
  semanticIntent: string | null;
  /** The affective reading of the same take, when one was taken (SRT-1 V). */
  expression: ExpressionState | null;
  bpm: number;
  /** Everything about this seed that was not measured, named. */
  notMeasured: string[];
}

/**
 * A gap this much longer than the take's own median gap ends a phrase.
 *
 * Relative rather than absolute: a slow ballad's gaps are all long, and a
 * fixed threshold would read every syllable of one as its own line.
 */
const PHRASE_GAP_RATIO = 2.2;

/** And never less than this, so an even, fast line is not cut into pieces. */
const PHRASE_GAP_MIN_SECONDS = 0.45;

/** How far above the phrase's own mean an onset must land to read as stressed. */
const STRESS_MARGIN = 1.06;

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const midiOf = (hz?: number) =>
  typeof hz === 'number' && hz > 0 ? Math.round(12 * Math.log2(hz / 440) + 69) : null;

/**
 * Reads a take as a lyric seed.
 *
 * Returns phrases even when there is one, and says what it could not measure
 * rather than filling it. A take with fewer than two onsets is not a cadence
 * and is reported as such instead of being described as a one-syllable line.
 */
export function deriveLyricSeed(
  onsets: SeedOnset[],
  opts: { bpm: number; semanticIntent?: string | null; expression?: ExpressionState | null }
): LyricSeed {
  const bpm = Math.max(1, opts.bpm);
  const notMeasured: string[] = [];
  const ordered = [...onsets].sort((a, b) => a.atSeconds - b.atSeconds);

  if (!ordered.some((o) => o.word)) {
    notMeasured.push(
      'words — nothing in this build recognises speech, so no position carries a word yet'
    );
  }
  if (!opts.semanticIntent) {
    notMeasured.push('theme — nothing measures what a take is about; say it and it is used');
  }
  if (!opts.expression) {
    notMeasured.push('emotional tone — no affective reading was taken of this take');
  }

  if (ordered.length < 2) {
    notMeasured.unshift(
      `cadence — ${ordered.length} onset${ordered.length === 1 ? '' : 's'} is not a cadence to fit language to`
    );
    return {
      positions: [],
      phrases: [],
      semanticIntent: opts.semanticIntent ?? null,
      expression: opts.expression ?? null,
      bpm,
      notMeasured,
    };
  }

  // --- phrases, from the gaps the creator actually left -------------------
  const gaps = ordered.slice(1).map((o, i) => o.atSeconds - ordered[i].atSeconds);
  const breakAt = Math.max(PHRASE_GAP_MIN_SECONDS, median(gaps) * PHRASE_GAP_RATIO);
  const phraseOf: number[] = [0];
  let phrase = 0;
  for (const gap of gaps) {
    if (gap > breakAt) phrase++;
    phraseOf.push(phrase);
  }

  // --- stress, against each phrase's own average --------------------------
  const meanByPhrase = new Map<number, number>();
  for (let p = 0; p <= phrase; p++) {
    const vs = ordered.filter((_, i) => phraseOf[i] === p).map((o) => o.velocity);
    meanByPhrase.set(p, vs.reduce((a, b) => a + b, 0) / Math.max(1, vs.length));
  }

  const ticksPerSecond = (bpm / 60) * 480;
  const positions: SyllablePosition[] = ordered.map((o, i) => {
    const p = phraseOf[i];
    const mean = meanByPhrase.get(p) || 1;
    const midiNote = midiOf(o.pitchHz);
    return {
      index: i,
      startTick: Math.round((o.atSeconds - ordered[0].atSeconds) * ticksPerSecond),
      atSeconds: o.atSeconds,
      stress: Math.round((o.velocity / Math.max(1, mean)) * 100) / 100,
      stressed: o.velocity >= mean * STRESS_MARGIN,
      midiNote,
      phrase: p,
      isRhymePosition: phraseOf[i + 1] !== p,
      // A position is only called a word when a word was actually heard there.
      kind: o.word
        ? 'WORD_RECOGNIZED'
        : midiNote !== null
          ? 'SYLLABLE_POSITION'
          : 'PHONETIC_FRAGMENT',
      word: o.word ?? null,
    };
  });

  const phrases: SeedPhrase[] = [];
  for (let p = 0; p <= phrase; p++) {
    const inPhrase = positions.filter((s) => s.phrase === p);
    if (!inPhrase.length) continue;
    phrases.push({
      index: p,
      syllableCount: inPhrase.length,
      startTick: inPhrase[0].startTick,
      endTick: inPhrase[inPhrase.length - 1].startTick,
      stressPattern: inPhrase.map((s) => (s.stressed ? '/' : 'x')).join(''),
    });
  }

  return {
    positions,
    phrases,
    semanticIntent: opts.semanticIntent ?? null,
    expression: opts.expression ?? null,
    bpm,
    notMeasured,
  };
}

/** How many of the four kinds this seed actually carries, for an honest header. */
export function seedComposition(seed: LyricSeed): Record<LyricSourceKind, number> {
  const out: Record<LyricSourceKind, number> = {
    WORD_RECOGNIZED: 0,
    PHONETIC_FRAGMENT: 0,
    SYLLABLE_POSITION: 0,
    SEMANTIC_INTENT: seed.semanticIntent ? 1 : 0,
  };
  for (const p of seed.positions) out[p.kind]++;
  return out;
}

/**
 * The words already in a line, laid over the positions that were performed.
 *
 * Mode A's half: when a creator has typed a line, this says which syllable of
 * it lands on which performed position, so the cadence can be seen rather
 * than trusted.
 */
export function layOverPhrase(text: string, seed: LyricSeed, phraseIndex: number) {
  const phrase = seed.phrases[phraseIndex];
  const positions = seed.positions.filter((p) => p.phrase === phraseIndex);
  const units = syllabify(text);
  return {
    phrase,
    pairs: positions.map((position, i) => ({ position, unit: units[i] ?? null })),
    /** Syllables with no performed position to land on. */
    overflow: units.slice(positions.length),
    syllableCount: countLine(text),
  };
}
