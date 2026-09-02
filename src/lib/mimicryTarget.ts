/**
 * What the creator says they are imitating.
 *
 * Section VIII.2 is explicit that the platform proposes ranked role hypotheses
 * "instead of requiring the creator to identify the instrument first". So this
 * is never required and never a switch. It is a prior: an optional statement of
 * intent that reweights a ranking the measurements still produce on their own.
 *
 * The distinction matters at the point where the two disagree. If a creator
 * declares a trumpet and then performs four unpitched thumps, a system that
 * treated the declaration as a command would file thumps as a trumpet and say
 * nothing. This one keeps every measured hypothesis, ranks the declared one on
 * the evidence for it, and says out loud that the take did not match what was
 * declared. Amendment B gives the creator "that's not what I heard"; this is
 * the same sentence travelling the other way, and it is the whole reason a
 * target is worth declaring at all.
 *
 * Every target's expectation is stated as numbers that can be checked against a
 * pass, not as a label. A target whose expectation cannot be measured would be
 * a decoration on a dropdown.
 */

import { InstrumentType } from '../types/daw';

export interface MimicryTarget {
  id: string;
  /** What the creator calls it. */
  label: string;
  /** Grouping for the picker, nothing more. */
  family: 'Brass' | 'Woodwind' | 'Strings' | 'Keys & Synth' | 'Low End' | 'Percussion' | 'Voice';
  /** The channel kind a take realized as this would become. */
  instrument: InstrumentType;
  /** What `RealizationRequest.targetRole` would carry. */
  targetRole: string;
  /**
   * What a pass imitating this should measure like. Checked against the take,
   * so a declaration that the audio contradicts can be reported rather than
   * obeyed.
   */
  expects: {
    /** Whether onsets should carry a tracked fundamental. */
    pitched: boolean;
    /** Comfortable written range in Hz, where the target is pitched. */
    loHz?: number;
    hiHz?: number;
  };
  /** Shown under the picker so the expectation is never hidden from the creator. */
  note: string;
}

/**
 * Ranges are the instrument's ordinary written range in concert pitch, taken to
 * the nearest semitone and widened by nothing. A creator's mouth will not cover
 * a trumpet's top octave, and that is the point: the check is on whether the
 * take is plausibly *about* this instrument, not on whether it is a good
 * impression of one.
 */
export const MIMICRY_TARGETS: MimicryTarget[] = [
  // Brass
  { id: 'trumpet', label: 'Trumpet', family: 'Brass', instrument: 'melody', targetRole: 'brass_trumpet',
    expects: { pitched: true, loHz: 165, hiHz: 988 }, note: 'E3 to B5, bright and front-of-beat' },
  { id: 'trombone', label: 'Trombone', family: 'Brass', instrument: 'melody', targetRole: 'brass_trombone',
    expects: { pitched: true, loHz: 82, hiHz: 494 }, note: 'E2 to B4, slides between notes rather than steps' },
  { id: 'brass_section', label: 'Brass section', family: 'Brass', instrument: 'melody', targetRole: 'brass_section',
    expects: { pitched: true, loHz: 110, hiHz: 880 }, note: 'stacked hits, A2 to A5' },

  // Woodwind
  { id: 'sax', label: 'Saxophone', family: 'Woodwind', instrument: 'melody', targetRole: 'woodwind_sax',
    expects: { pitched: true, loHz: 138, hiHz: 831 }, note: 'C#3 to G#5, reedy and sustained' },
  { id: 'flute', label: 'Flute', family: 'Woodwind', instrument: 'melody', targetRole: 'woodwind_flute',
    expects: { pitched: true, loHz: 262, hiHz: 2093 }, note: 'C4 to C7, airy and high' },

  // Strings
  { id: 'violin', label: 'Violin', family: 'Strings', instrument: 'melody', targetRole: 'strings_violin',
    expects: { pitched: true, loHz: 196, hiHz: 2093 }, note: 'G3 to C7, bowed and continuous' },
  { id: 'cello', label: 'Cello', family: 'Strings', instrument: 'melody', targetRole: 'strings_cello',
    expects: { pitched: true, loHz: 65, hiHz: 523 }, note: 'C2 to C5, chest register' },
  { id: 'string_pad', label: 'String pad', family: 'Strings', instrument: 'melody', targetRole: 'strings_ensemble',
    expects: { pitched: true, loHz: 98, hiHz: 1047 }, note: 'held chords, G2 to C6' },

  // Keys & synth
  { id: 'lead_synth', label: 'Lead synth', family: 'Keys & Synth', instrument: 'melody', targetRole: 'lead_synth',
    expects: { pitched: true, loHz: 131, hiHz: 1568 }, note: 'C3 to G6, one line out front' },
  { id: 'rhodes', label: 'Rhodes / keys', family: 'Keys & Synth', instrument: 'melody', targetRole: 'vintage_rhodes',
    expects: { pitched: true, loHz: 98, hiHz: 1047 }, note: 'struck and decaying, G2 to C6' },

  // Low end
  { id: 'electric_bass', label: 'Bass guitar', family: 'Low End', instrument: 'bass', targetRole: 'electric_bass',
    expects: { pitched: true, loHz: 41, hiHz: 392 }, note: 'E1 to G4, plucked' },
  { id: 'sub_synth', label: '808 / sub', family: 'Low End', instrument: 'bass', targetRole: 'sub_synth',
    expects: { pitched: true, loHz: 28, hiHz: 165 }, note: 'A0 to E3, felt more than heard' },

  // Percussion
  { id: 'drum_kit', label: 'Drum kit', family: 'Percussion', instrument: 'kick', targetRole: 'studio_drum_kit',
    expects: { pitched: false }, note: 'kick, snare and hats as one performance' },
  { id: 'hand_perc', label: 'Hand percussion', family: 'Percussion', instrument: 'percussion', targetRole: 'hand_percussion',
    expects: { pitched: false }, note: 'congas, shakers, rim taps' },

  // Voice
  { id: 'lead_vocal', label: 'Lead vocal', family: 'Voice', instrument: 'vocal_synth', targetRole: 'lead_vocal',
    expects: { pitched: true, loHz: 82, hiHz: 1047 }, note: 'kept as a voice, E2 to C6' },
  { id: 'choir', label: 'Choir / stack', family: 'Voice', instrument: 'vocal_synth', targetRole: 'vocal_stack',
    expects: { pitched: true, loHz: 98, hiHz: 880 }, note: 'stacked voices, G2 to A5' },
];

export const targetById = (id: string | null | undefined): MimicryTarget | null =>
  (id && MIMICRY_TARGETS.find((t) => t.id === id)) || null;

export const TARGET_FAMILIES = [
  ...new Set(MIMICRY_TARGETS.map((t) => t.family)),
] as MimicryTarget['family'][];

/**
 * How well a pass matches what a declared target should measure like.
 *
 * Returns 0..1, and the reasons. A score of 1 is not "a good impression" -- it
 * is only "nothing here contradicts what you said". Nothing in this file can
 * raise a reading above the evidence for it; agreement scales a confidence that
 * was measured elsewhere, and can only ever hold it down.
 */
export function agreementWith(
  target: MimicryTarget,
  measured: {
    pitchedOnsets: number;
    percussiveOnsets: number;
    meanPitchHz: number | null;
    lowestPitchHz: number | null;
    highestPitchHz: number | null;
  }
): { score: number; reasons: string[]; contradicts: string | null } {
  const reasons: string[] = [];
  const total = measured.pitchedOnsets + measured.percussiveOnsets;
  if (total === 0) {
    return { score: 0, reasons: ['nothing measurable in the pass'], contradicts: null };
  }

  if (target.expects.pitched) {
    const share = measured.pitchedOnsets / total;
    if (measured.pitchedOnsets === 0) {
      return {
        score: 0,
        reasons: ['no onset in this pass carried a tracked fundamental'],
        contradicts: `${target.label} is a pitched instrument, and nothing in this take was pitched.`,
      };
    }
    reasons.push(`${measured.pitchedOnsets} of ${total} onsets pitched`);

    // How much of the performed range sits inside the instrument's range.
    const lo = target.expects.loHz ?? 0;
    const hi = target.expects.hiHz ?? Infinity;
    const pLo = measured.lowestPitchHz ?? 0;
    const pHi = measured.highestPitchHz ?? 0;
    const overlap = Math.max(0, Math.min(pHi, hi) - Math.max(pLo, lo));
    const performed = Math.max(1, pHi - pLo);
    const inRange = pLo >= lo && pHi <= hi ? 1 : Math.min(1, overlap / performed);

    if (inRange >= 0.99) reasons.push(`the whole take sits inside ${target.label}'s range`);
    else if (inRange > 0) reasons.push(`${Math.round(inRange * 100)}% of the performed range sits inside ${target.label}'s`);

    const contradicts =
      inRange === 0
        ? `The take runs ${Math.round(pLo)}-${Math.round(pHi)} Hz. ${target.label} covers ${Math.round(lo)}-${Math.round(hi === Infinity ? 0 : hi)} Hz, so they do not overlap.`
        : null;

    return { score: round3(Math.min(share + 0.25, 1) * inRange), reasons, contradicts };
  }

  // Unpitched target.
  const share = measured.percussiveOnsets / total;
  if (measured.percussiveOnsets === 0) {
    return {
      score: 0,
      reasons: ['no onset in this pass read as percussive'],
      contradicts: `${target.label} is unpitched, and every onset in this take carried a fundamental.`,
    };
  }
  reasons.push(`${measured.percussiveOnsets} of ${total} onsets percussive`);
  return { score: round3(Math.min(share + 0.25, 1)), reasons, contradicts: null };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
