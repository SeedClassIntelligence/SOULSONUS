/**
 * Genre as a parameter, not an output label.
 *
 * SRT-1 XIV is explicit that genre support "should not mean a simple
 * classifier": it is a genre-conditioned creation framework, and genre affects
 * instrumentation, rhythm, harmonic language, arrangement, production,
 * dynamics, vocal treatment, tempo and mix aesthetic. The section's own
 * example is the shape of the whole feature --
 *
 *     "Take this melody and interpret it as neo-soul."
 *     "Now let me hear a cinematic version."
 *
 * -- and then the sentence that governs everything here: "The underlying
 * creative identity remains while production grammar changes."
 *
 * Three rules follow from that and are enforced rather than described.
 *
 * Nothing classifies the creator. A genre is named by the person, or there is
 * none. The platform reading a take and announcing "this is trap" would be the
 * output label the section rules out, and it would be a claim about them.
 *
 * A grammar conditions production, never performance. The dimensions it
 * touches are listed on it, and `conditionable` refuses any of them that the
 * creator's own preserve set holds -- so asking for a cinematic version cannot
 * quietly re-time or re-pitch what was played. That is the sentence about
 * creative identity, in code.
 *
 * And a grammar states what it is, in the creator's terms, so a request that
 * reaches a model carries the grammar rather than the word. "Neo-soul" as a
 * bare token means whatever the model's training makes of it; the rules below
 * are what the creator would actually be asking for.
 */

import type { PreservableProperty } from './intentPolicy';

/** The nine dimensions SRT-1 XIV names, and nothing beyond them. */
export type GenreDimension =
  | 'instrumentation'
  | 'rhythm'
  | 'harmonicLanguage'
  | 'arrangement'
  | 'production'
  | 'dynamics'
  | 'vocalTreatment'
  | 'tempo'
  | 'mixAesthetic';

export const GENRE_DIMENSIONS: GenreDimension[] = [
  'instrumentation',
  'rhythm',
  'harmonicLanguage',
  'arrangement',
  'production',
  'dynamics',
  'vocalTreatment',
  'tempo',
  'mixAesthetic',
];

export const GENRE_DIMENSION_LABEL: Record<GenreDimension, string> = {
  instrumentation: 'instrumentation',
  rhythm: 'rhythm',
  harmonicLanguage: 'harmonic language',
  arrangement: 'arrangement',
  production: 'production',
  dynamics: 'dynamics',
  vocalTreatment: 'vocal treatment',
  tempo: 'tempo',
  mixAesthetic: 'mix aesthetic',
};

/**
 * Which performance property a genre dimension would have to move.
 *
 * This is the join between a grammar and the intent contract. A grammar that
 * wants to change rhythm is asking to move the creator's rhythm, and if the
 * contract holds rhythm the grammar does not get it. Dimensions absent from
 * this map touch no performed property at all -- instrumentation and mix
 * aesthetic are about the sound, not about what was played.
 */
const DIMENSION_TOUCHES: Partial<Record<GenreDimension, PreservableProperty>> = {
  rhythm: 'rhythm',
  tempo: 'timing',
  harmonicLanguage: 'pitchContour',
  vocalTreatment: 'articulation',
};

export interface GenreGrammar {
  id: string;
  label: string;
  /** What this grammar asks for, per dimension, in the creator's terms. */
  rules: Partial<Record<GenreDimension, string>>;
}

/**
 * A small, stated set. Not a taxonomy of music -- a set of grammars the studio
 * can actually describe, each of which says what it would do rather than
 * naming a scene. A creator who wants something not here types it, and what
 * they typed is carried instead.
 */
export const GENRE_GRAMMARS: GenreGrammar[] = [
  {
    id: 'neo_soul',
    label: 'neo-soul',
    rules: {
      instrumentation: 'Rhodes, upright or round-wound electric bass, brushed or loose kit',
      harmonicLanguage: 'extended chords — 9ths, 11ths, 13ths — over a slow harmonic rhythm',
      rhythm: 'behind the beat, ghost notes kept',
      dynamics: 'narrow and warm; nothing is pushed',
      production: 'analogue saturation, little compression, room left in',
      mixAesthetic: 'dark top, wide mids, bass felt rather than heard',
    },
  },
  {
    id: 'cinematic',
    label: 'cinematic',
    rules: {
      instrumentation: 'strings, low brass, sustained pads, sparse percussion',
      arrangement: 'builds by adding weight rather than by adding parts',
      dynamics: 'wide — the quiet parts stay quiet',
      harmonicLanguage: 'modal, suspended, slow to resolve',
      production: 'long reverb tails, no obvious transient shaping',
      mixAesthetic: 'depth over loudness',
    },
  },
  {
    id: 'trap',
    label: 'trap',
    rules: {
      instrumentation: '808 sub with glide, tight synthetic kit, sparse melodic top',
      rhythm: 'triplet hi-hat subdivisions against a half-time backbeat',
      arrangement: 'short repeating cells; space is an instrument',
      dynamics: 'flat and loud, with the sub carrying the weight',
      mixAesthetic: 'mono sub, wide top, nothing in the low mids',
    },
  },
  {
    id: 'house',
    label: 'house',
    rules: {
      instrumentation: 'four-on-the-floor kit, filtered chords, sustained bass',
      rhythm: 'straight quarters with off-beat hats',
      arrangement: 'eight- and sixteen-bar phrases, one change per phrase',
      production: 'sidechain movement against the kick',
      mixAesthetic: 'even and forward; nothing hides',
    },
  },
  {
    id: 'folk',
    label: 'folk',
    rules: {
      instrumentation: 'acoustic guitar, upright bass, brushed snare or none',
      harmonicLanguage: 'triads and sus chords, diatonic',
      production: 'close mics, minimal processing, the room audible',
      vocalTreatment: 'dry and forward, breath left in',
      mixAesthetic: 'small, honest, uncompressed',
    },
  },
];

export const grammarById = (id: string | null | undefined): GenreGrammar | null =>
  (id && GENRE_GRAMMARS.find((g) => g.id === id)) || null;

export interface ConditionedGenre {
  grammar: GenreGrammar;
  /** Dimensions this grammar is allowed to move, given the creator's contract. */
  conditioned: GenreDimension[];
  /** Dimensions the contract holds, and the property each would have moved. */
  withheld: { dimension: GenreDimension; property: PreservableProperty }[];
}

/**
 * Works out what a genre may actually change, given what the creator is
 * holding.
 *
 * The seed's sentence is the test: the underlying creative identity remains
 * while production grammar changes. A grammar asking for triplet hats over a
 * take whose rhythm is held does not get the rhythm; it still gets the kit,
 * the arrangement and the mix.
 */
export function conditionGenre(
  grammar: GenreGrammar,
  preserve: PreservableProperty[]
): ConditionedGenre {
  const conditioned: GenreDimension[] = [];
  const withheld: ConditionedGenre['withheld'] = [];
  for (const dimension of GENRE_DIMENSIONS) {
    if (!grammar.rules[dimension]) continue;
    const property = DIMENSION_TOUCHES[dimension];
    if (property && preserve.includes(property)) withheld.push({ dimension, property });
    else conditioned.push(dimension);
  }
  return { grammar, conditioned, withheld };
}

/**
 * The grammar as an instruction, carrying only what it is allowed to change.
 *
 * This is what makes genre a parameter rather than a label: what rides with a
 * realization is the set of rules the creator's contract permits, not the word
 * "neo-soul" for a model to interpret however it was trained to.
 */
export function describeGenre(conditioned: ConditionedGenre | null): string {
  if (!conditioned || !conditioned.conditioned.length) return '';
  const { grammar } = conditioned;
  const rules = conditioned.conditioned
    .map((d) => `${GENRE_DIMENSION_LABEL[d]}: ${grammar.rules[d]}`)
    .join('; ');
  const held = conditioned.withheld.length
    ? ` Leave ${conditioned.withheld
        .map((w) => GENRE_DIMENSION_LABEL[w.dimension])
        .join(' and ')} exactly as performed.`
    : '';
  return `Production grammar — ${grammar.label}. ${rules}.${held}`;
}
