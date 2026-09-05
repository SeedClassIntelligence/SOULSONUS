/**
 * The affective reading as compositional control variables.
 *
 * SRT-1 V is specific that this is the point of the whole section. Not "AI
 * detects sadness", but: "The system derives emotional characteristics from
 * human expression and uses those characteristics as compositional control
 * variables across multiple musical dimensions." It then names the dimensions
 * -- tempo, harmonic tension, chord vocabulary, scale or mode, rhythmic
 * density, instrumentation, register, dynamics, timbral brightness,
 * arrangement density, reverberation, melodic contour.
 *
 * This turns a measured state into changes on those dimensions, and it holds
 * two lines that stop it from becoming the reduction the seed warns about.
 *
 * A dimension that was not measured controls nothing. A middle reading
 * controls nothing either: the studio proposing a change off a value of 0.05
 * would be acting on noise and calling it a feeling.
 *
 * And a control that the platform cannot actually make is said, not faked.
 * Timbral brightness, dynamics and reverberation are real settings on a
 * channel strip and are proposed as settings. Harmonic tension and chord
 * vocabulary are not something this build can apply to a performance, so they
 * come back as what they are -- a suggestion with the measurement behind it
 * and nothing to click.
 */

import type { ExpressionDimensionName, ExpressionState, TrackDspSettings } from '../types/daw';
import { rationaleFrom, sayRationale, type MusicalRationale } from './musicalRationale';

/** The musical dimensions SRT-1 V lists, as far as this build reaches them. */
export type MusicalDimension =
  | 'timbral_brightness'
  | 'dynamics'
  | 'reverberation'
  | 'register'
  | 'harmonic_tension'
  | 'rhythmic_density';

export const DIMENSION_LABEL: Record<MusicalDimension, string> = {
  timbral_brightness: 'timbral brightness',
  dynamics: 'dynamics',
  reverberation: 'reverberation',
  register: 'register',
  harmonic_tension: 'harmonic tension',
  rhythmic_density: 'rhythmic density',
};

export interface ExpressionControl {
  /** Which musical dimension this moves. */
  dimension: MusicalDimension;
  /** Which affective dimension drove it. */
  driver: ExpressionDimensionName;
  /** What it does, in the creator's terms. */
  reads: string;
  /** The reading and the measurement behind it. Never empty. */
  because: string;
  /**
   * The settings this becomes on a channel. Null when the platform cannot
   * make the change itself, which is stated rather than implied.
   */
  dspSettings: Partial<TrackDspSettings> | null;
}

/**
 * Below this a dimension is not saying anything.
 *
 * A reading of 0.1 on a seven-point axis is the middle, and the middle is a
 * real answer -- it is not a small instruction.
 */
export const CONTROL_THRESHOLD = 0.3;

/**
 * Turns a measured state into the changes it argues for.
 *
 * Ordered strongest reading first, so a caller that shows two of them shows
 * the two the performance was clearest about.
 */
export function controlsFromExpression(state: ExpressionState | null): ExpressionControl[] {
  if (!state) return [];
  const out: ExpressionControl[] = [];
  const at = (name: ExpressionDimensionName) => {
    const d = state[name];
    return d && Math.abs(d.value) >= CONTROL_THRESHOLD ? d : null;
  };

  const darkness = at('darkness');
  if (darkness) {
    const heavy = darkness.value > 0;
    out.push({
      dimension: 'timbral_brightness',
      driver: 'darkness',
      reads: heavy
        ? 'roll the top off — a low-pass at 2.2 kHz and the highs down 2 dB'
        : 'open the top — a low-pass out at 9 kHz and the highs up 2 dB',
      because: `the take reads ${darkness.reads} (${darkness.from})`,
      dspSettings: heavy
        ? { filterType: 'lowpass', filterFreq: 2200, highGain: -2 }
        : { filterType: 'lowpass', filterFreq: 9000, highGain: 2 },
    });
  }

  const arousal = at('arousal');
  if (arousal) {
    const energetic = arousal.value > 0;
    out.push({
      dimension: 'dynamics',
      driver: 'arousal',
      reads: energetic
        ? 'hold it together — threshold −22 dB at 4:1, so the drive stays level'
        : 'let it breathe — threshold −12 dB at 2:1, so the quiet stays quiet',
      because: `the take reads ${arousal.reads} (${arousal.from})`,
      dspSettings: energetic
        ? { compressorThreshold: -22, compressorRatio: 4 }
        : { compressorThreshold: -12, compressorRatio: 2 },
    });
  }

  const intimacy = at('intimacy');
  if (intimacy) {
    const personal = intimacy.value > 0;
    out.push({
      dimension: 'reverberation',
      driver: 'intimacy',
      reads: personal
        ? 'keep it close — reverb send down to 0.06 and a little body at the bottom'
        : 'give it room — reverb send up to 0.32',
      because: `the take reads ${intimacy.reads} (${intimacy.from})`,
      dspSettings: personal ? { reverbSend: 0.06, lowGain: 1.5 } : { reverbSend: 0.32 },
    });
  }

  const confidence = at('confidence');
  if (confidence) {
    const assertive = confidence.value > 0;
    out.push({
      dimension: 'register',
      driver: 'confidence',
      reads: assertive
        ? 'push it forward — 2.5 kHz up 2 dB, where a voice cuts'
        : 'sit it back — 2.5 kHz down 1.5 dB, so it stops leaning on the listener',
      because: `the take reads ${confidence.reads} (${confidence.from})`,
      dspSettings: assertive
        ? { midFreqHz: 2500, midGain: 2, midQ: 0.9 }
        : { midFreqHz: 2500, midGain: -1.5, midQ: 0.9 },
    });
  }

  // The two this build cannot apply. Named, with the reading, and with
  // nothing to click -- a proposal that cannot be carried out is worse than a
  // sentence saying so.
  const tension = at('tension');
  if (tension) {
    out.push({
      dimension: 'harmonic_tension',
      driver: 'tension',
      reads:
        tension.value > 0
          ? 'the harmony could stay unresolved longer — a suspended or added-9th voicing under this'
          : 'the harmony can settle — a plain triad will not fight this',
      because: `the take reads ${tension.reads} (${tension.from})`,
      dspSettings: null,
    });
  }

  const movement = at('movement');
  if (movement) {
    out.push({
      dimension: 'rhythmic_density',
      driver: 'movement',
      reads:
        movement.value > 0
          ? 'the arrangement can carry a steady subdivision under this without crowding it'
          : 'leave space — another steady part under this would fill the room it is using',
      because: `the take reads ${movement.reads} (${movement.from})`,
      dspSettings: null,
    });
  }

  return out.sort((a, b) => {
    const av = Math.abs(state[a.driver]?.value ?? 0);
    const bv = Math.abs(state[b.driver]?.value ?? 0);
    return bv - av;
  });
}

/**
 * The sentence the plan asks for: a change explained by what was measured,
 * naming what was deliberately left alone.
 *
 * SRT-1 V's failure mode is a reduction -- "detect emotion, pick a mode" --
 * so what is NOT being changed on the strength of a reading matters as much as
 * what is. Tempo is the example the retrofit plan uses and it is never moved
 * here: a creator's performance sits at the tempo they played it at.
 */
export function expressionRationale(controls: ExpressionControl[]): MusicalRationale | null {
  if (!controls.length) return null;
  const applied = controls.filter((c) => c.dspSettings);
  const stated = controls.filter((c) => !c.dspSettings);
  const lead = applied[0] || controls[0];
  return rationaleFrom({
    says: applied.length
      ? `${lead.reads}${applied.length > 1 ? `, and ${applied.slice(1).map((c) => `${DIMENSION_LABEL[c.dimension]}: ${c.reads}`).join('; ')}` : ''}`
      : lead.reads,
    because: [lead.because, ...applied.slice(1).map((c) => c.because)],
    ratherThan: [
      // The example A.12 gives ends on the thing it refused to do, and this is
      // that thing: a creator's tempo is theirs, and a reading of their mood is
      // not a reason to move it.
      'touching the tempo — you played this at the tempo you played it at',
      ...stated.map(
        (c) => `${DIMENSION_LABEL[c.dimension]}, which this build cannot apply for you (${c.reads})`
      ),
    ],
  });
}

/** The same reasoning as one sentence, for a caller with a line to fill. */
export function explainExpressionChange(controls: ExpressionControl[]): string {
  const rationale = expressionRationale(controls);
  return rationale ? sayRationale(rationale) : '';
}

/** Every setting the applicable controls agree on, as one patch. */
export function dspFromExpression(controls: ExpressionControl[]): Partial<TrackDspSettings> {
  return controls.reduce<Partial<TrackDspSettings>>(
    (acc, c) => (c.dspSettings ? { ...acc, ...c.dspSettings } : acc),
    {}
  );
}
