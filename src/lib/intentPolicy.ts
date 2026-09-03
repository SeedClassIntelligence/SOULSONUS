/**
 * What the creator will not let a realization change, and how hard.
 *
 * Phase 3b of the retrofit plan. Until now the intent contract held the same
 * four properties for every route, every target and every creator -- a `let`
 * in `realizationRouter` reading
 *
 *     ['rhythm', 'timing', 'pitchContour', 'articulation']
 *
 * that nothing could reach. `RealizationRequest.thresholdPolicy` existed and
 * was settable, and no file in the application set it. So the contract was
 * real and enforced, and the creator had no say in what it enforced.
 *
 * Two things move here and they are different questions:
 *
 *   preserve    which properties are held at all. A property that is not in
 *               this set is not scored, not violated, and not a reason to
 *               refuse a candidate.
 *   strictness  how close a held property has to stay. This scales the role
 *               thresholds that were already measured into the platform; it
 *               does not invent new ones.
 *
 * Unlocking is a real decision with a real consequence, and the panel that
 * offers it has to say so: take timing out of the preserve set and a candidate
 * that mangles your timing will pass the contract, because you told it to stop
 * checking. Amendment E puts that decision with the owner. It does not permit
 * making it quietly.
 */

import type { IntentThresholdPolicy, RealizationScoreMap } from '../types/daw';
import { DEFAULT_THRESHOLD_POLICY } from './realizationVerifier';

export type PreservableProperty = keyof RealizationScoreMap;

/** The four the contract has always held. This stays the default. */
export const DEFAULT_PRESERVE: PreservableProperty[] = [
  'rhythm',
  'timing',
  'pitchContour',
  'articulation',
];

export type Strictness = 'as_performed' | 'close' | 'loose';

/**
 * How each strictness moves the measured role thresholds.
 *
 * 'close' is the platform's own numbers, unchanged -- it is the setting that
 * has been in force all along, named. The other two move from there rather
 * than from a number chosen here, so the role tuning already in
 * DEFAULT_THRESHOLD_POLICY is not thrown away by a creator asking for a
 * looser take.
 */
const STRICTNESS_SHIFT: Record<Strictness, number> = {
  as_performed: 0.04,
  close: 0,
  loose: -0.15,
};

export const STRICTNESS_LABEL: Record<Strictness, string> = {
  as_performed: 'as performed',
  close: 'close',
  loose: 'loose',
};

export const STRICTNESS_MEANING: Record<Strictness, string> = {
  as_performed: 'hold it almost exactly. Fewer candidates will pass.',
  close: 'the studio’s measured thresholds for this instrument.',
  loose: 'let it drift. More candidates pass, and more of them will not be what you played.',
};

export interface IntentPolicy {
  /** Properties the contract will score and can refuse a candidate over. */
  lockedProperties: PreservableProperty[];
  /** The bar each held property must clear. */
  thresholdPolicy: IntentThresholdPolicy;
  /** What the creator gave up by unlocking, named. Empty when nothing is unlocked. */
  unlocked: PreservableProperty[];
}

const clamp = (n: number) => Math.max(0.05, Math.min(0.995, n));

/**
 * Builds the contract the creator actually asked for.
 *
 * `roleKey` selects the measured base thresholds -- a kick and a vocal are not
 * held to the same pitch contour, and that difference was tuned before this
 * file existed.
 */
export function buildIntentPolicy(
  preserve: PreservableProperty[],
  strictness: Strictness,
  roleKey: string
): IntentPolicy {
  const base =
    DEFAULT_THRESHOLD_POLICY[roleKey] || DEFAULT_THRESHOLD_POLICY.default;
  const shift = STRICTNESS_SHIFT[strictness] ?? 0;

  const thresholdPolicy: IntentThresholdPolicy = {
    rhythm: clamp(base.rhythm + shift),
    timing: clamp(base.timing + shift),
    pitchContour: clamp(base.pitchContour + shift),
    articulation: clamp(base.articulation + shift),
  };

  // Order is kept stable rather than following whatever order the creator
  // toggled things in, so two identical policies compare equal.
  const lockedProperties = DEFAULT_PRESERVE.filter((p) => preserve.includes(p));
  const unlocked = DEFAULT_PRESERVE.filter((p) => !preserve.includes(p));

  return { lockedProperties, thresholdPolicy, unlocked };
}

/**
 * Plain sentence for what unlocking these properties means.
 *
 * Returns null when nothing is unlocked, so a caller cannot render a warning
 * over a contract that is fully intact.
 */
export function describeUnlocked(unlocked: PreservableProperty[]): string | null {
  if (!unlocked.length) return null;
  const NAMES: Record<PreservableProperty, string> = {
    rhythm: 'rhythm',
    timing: 'timing',
    pitchContour: 'pitch contour',
    articulation: 'articulation',
  };
  const list = unlocked.map((p) => NAMES[p]).join(', ');
  return `${list} ${unlocked.length === 1 ? 'is' : 'are'} not being checked. A candidate that changes ${unlocked.length === 1 ? 'it' : 'them'} will pass.`;
}

/** The role key the threshold table is tuned against. */
export function roleKeyFor(targetRole: string): string {
  const r = targetRole.toLowerCase();
  if (r.includes('kick')) return 'kick';
  if (r.includes('snare')) return 'snare';
  if (r.includes('vocal')) return 'vocal';
  if (r.includes('bass')) return 'bass';
  return 'melody';
}
