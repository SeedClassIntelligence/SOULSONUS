/**
 * Emotion as measured dimensions, from the performance itself.
 *
 * SRT-1 V says the earlier documentation reduced this too far -- "detect
 * emotion -> select C major or A minor" -- and that the real idea is a
 * multidimensional representation derived from measured expression and used as
 * a set of compositional control variables. This derives that representation.
 *
 * Everything here comes from measurements the capture path already makes.
 * `OnsetFeatures` carries an onset's RMS, its spectral centroid, its per-band
 * energies and its fundamental; the pass carries their positions in time. The
 * seed's own list of inputs -- pitch, pitch variability, rate, intensity,
 * spectral characteristics -- maps onto exactly those, and nothing else is
 * invented to fill a dimension out.
 *
 * Two rules hold this honest.
 *
 * A dimension with nothing measured behind it is null and named. A beatbox
 * take carries no pitch, so valence and tension cannot be read from it and are
 * not; a reading rebuilt from notes on a track carries no spectrum, so
 * darkness and intimacy are not. Seven confident numbers over a take that
 * supports three would look exactly like understanding.
 *
 * And the mapping is stated, not hidden. Each dimension reports the
 * measurement and the mapping that produced it, so a creator who disagrees can
 * see what the studio thought it heard -- and their own reading overrides it,
 * which is the seed's "user-specified emotional intent" and Amendment B's
 * order of authority.
 */

import type { ExpressionDimension, ExpressionDimensionName, ExpressionState } from '../types/daw';

/** The measurements one onset contributes. A subset of `CaptureEvent`. */
export interface ExpressionOnset {
  velocity: number;
  /** Seconds from the start of the pass. */
  atSeconds: number;
  /** Spectral centroid in Hz, or 0/undefined when the onset carries no spectrum. */
  centroidHz?: number;
  /** Fundamental in Hz, or -1/0 for percussive onsets. */
  pitchHz?: number;
  /** Per-band means, when the onset carries a spectrum. */
  bands?: Record<string, number>;
}

/**
 * The poles, in the order SRT-1 V writes them: value -1 is the first, +1 the
 * second.
 */
export const EXPRESSION_POLES: Record<ExpressionDimensionName, [string, string]> = {
  valence: ['negative', 'positive'],
  arousal: ['calm', 'energetic'],
  tension: ['relaxed', 'unresolved'],
  confidence: ['vulnerable', 'assertive'],
  intimacy: ['distant', 'personal'],
  darkness: ['bright', 'heavy'],
  movement: ['static', 'driving'],
};

export const EXPRESSION_DIMENSIONS: ExpressionDimensionName[] = [
  'valence',
  'arousal',
  'tension',
  'confidence',
  'intimacy',
  'darkness',
  'movement',
];

/**
 * Onsets per second at the two ends of the rate scale.
 *
 * One per second is a quarter-note pulse at 60 BPM -- about as slow as a
 * performance gets while still being a performance. Eight per second is 32nds
 * at 120 BPM, which is the top of what a mouth or a pair of hands sustains.
 * Read logarithmically, because doubling the rate is one step in feel and not
 * seven.
 */
const RATE_SLOW = 1;
const RATE_FAST = 8;

/**
 * Spectral centroid in Hz at the two ends of the brightness scale.
 *
 * 150 Hz is the body of a kick or a chesty low voice; 6 kHz is hi-hat sizzle
 * and air. Also logarithmic: pitch and brightness are heard in ratios.
 */
const CENTROID_DARK_HZ = 150;
const CENTROID_BRIGHT_HZ = 6000;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const bipolar = (n01: number) => Math.round((clamp01(n01) * 2 - 1) * 100) / 100;
const logScale = (v: number, lo: number, hi: number) =>
  clamp01(Math.log(Math.max(lo, Math.min(hi, v)) / lo) / Math.log(hi / lo));

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const stdev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) * (x - m))));
};
const semitones = (hz: number, ref: number) => 12 * Math.log2(Math.max(1, hz) / Math.max(1, ref));

const dimension = (
  name: ExpressionDimensionName,
  value: number,
  from: string
): ExpressionDimension => {
  const [low, high] = EXPRESSION_POLES[name];
  const strength = Math.abs(value);
  const pole = value < 0 ? low : high;
  const reads = strength < 0.15 ? `between ${low} and ${high}` : strength < 0.5 ? `slightly ${pole}` : pole;
  return { value, reads, from };
};

/**
 * Reads the seven dimensions off a pass.
 *
 * `onsets` is the whole pass, not the last event: a performance is the thing
 * being read. Returns nulls and reasons rather than a partial guess.
 */
export function deriveExpression(onsets: ExpressionOnset[]): ExpressionState {
  const notMeasured: string[] = [];
  const empty: ExpressionState = {
    valence: null,
    arousal: null,
    tension: null,
    confidence: null,
    intimacy: null,
    darkness: null,
    movement: null,
    notMeasured,
    measuredFrom: { onsets: onsets.length, pitchedOnsets: 0, spanSeconds: 0, spectralOnsets: 0 },
  };

  const pitched = onsets.filter((o) => (o.pitchHz ?? -1) > 0);
  const spectral = onsets.filter((o) => (o.centroidHz ?? 0) > 0);
  const times = onsets.map((o) => o.atSeconds).sort((a, b) => a - b);
  const span = times.length > 1 ? times[times.length - 1] - times[0] : 0;
  empty.measuredFrom = {
    onsets: onsets.length,
    pitchedOnsets: pitched.length,
    spanSeconds: Math.round(span * 100) / 100,
    spectralOnsets: spectral.length,
  };

  if (onsets.length < 2 || span <= 0) {
    notMeasured.push(
      `all seven — ${onsets.length} onset${onsets.length === 1 ? '' : 's'} over ${span.toFixed(2)}s is not a performance to read`
    );
    return empty;
  }

  // --- rate and intensity: the two things every pass carries ------------
  const intervals = times.slice(1).map((t, i) => t - times[i]);
  const rate = intervals.length / span;
  const rateN = logScale(rate, RATE_SLOW, RATE_FAST);
  const velocities = onsets.map((o) => o.velocity);
  const intensityN = clamp01(mean(velocities) / 127);
  const rateText = `${rate.toFixed(1)} onsets/s over ${span.toFixed(1)}s`;
  const intensityText = `mean velocity ${Math.round(mean(velocities))}`;

  // --- arousal: how much is happening, and how hard ---------------------
  const arousal = dimension(
    'arousal',
    bipolar(0.6 * rateN + 0.4 * intensityN),
    `${rateText}, ${intensityText} — rate weighted 0.6, intensity 0.4`
  );

  // --- movement: how regular the pulse is, and how dense ----------------
  //
  // Distinct from arousal on purpose: a fast, ragged flurry is aroused and not
  // driving, and a steady mid-tempo pulse is driving without being frantic.
  let movement: ExpressionDimension | null = null;
  if (intervals.length >= 2) {
    const cv = mean(intervals) > 0 ? stdev(intervals) / mean(intervals) : 1;
    const regularity = clamp01(1 - cv);
    movement = dimension(
      'movement',
      bipolar(0.5 * regularity + 0.5 * rateN),
      `spacing varies ${Math.round(cv * 100)}% of its own average, ${rateText}`
    );
  } else {
    notMeasured.push('movement — two onsets give one gap, which is not a pulse');
  }

  // --- confidence: how hard, and how surely --------------------------
  //
  // Assertive is committed: struck hard and struck consistently. Wide swings
  // in how hard each hit lands read as tentative rather than as dynamics,
  // which is why the spread counts against it.
  const velSpread = mean(velocities) > 0 ? clamp01(stdev(velocities) / mean(velocities)) : 1;
  const confidence = dimension(
    'confidence',
    bipolar(0.6 * intensityN + 0.4 * (1 - velSpread)),
    `${intensityText}, varying ${Math.round(velSpread * 100)}% of its own average`
  );

  // --- darkness and intimacy: what the spectrum says --------------------
  let darkness: ExpressionDimension | null = null;
  let intimacy: ExpressionDimension | null = null;
  if (spectral.length) {
    const centroid = mean(spectral.map((o) => o.centroidHz as number));
    const brightness = logScale(centroid, CENTROID_DARK_HZ, CENTROID_BRIGHT_HZ);
    const shares = spectral.map((o) => {
      const b = o.bands || {};
      const total = Object.values(b).reduce((a, v) => a + v, 0);
      if (!total) return null;
      return {
        low: ((b.sub || 0) + (b.low || 0)) / total,
        body: ((b.low || 0) + (b.lowMid || 0)) / total,
        air: (b.air || 0) / total,
      };
    });
    const known = shares.filter(Boolean) as { low: number; body: number; air: number }[];
    const lowShare = known.length ? mean(known.map((s) => s.low)) : null;

    darkness = dimension(
      'darkness',
      bipolar(lowShare === null ? 1 - brightness : 0.65 * (1 - brightness) + 0.35 * lowShare),
      lowShare === null
        ? `spectral centroid ${Math.round(centroid)} Hz`
        : `spectral centroid ${Math.round(centroid)} Hz, ${Math.round(lowShare * 100)}% of the energy below 250 Hz`
    );

    // Personal is quiet and close: little projection, and more body than air.
    // Distant is the opposite, and a loud take cannot be intimate however it
    // is voiced.
    if (known.length) {
      const proximity = clamp01(mean(known.map((s) => s.body - s.air)) * 2 + 0.5);
      intimacy = dimension(
        'intimacy',
        bipolar(0.6 * (1 - intensityN) + 0.4 * proximity),
        `${intensityText}, body against air ${Math.round(mean(known.map((s) => s.body)) * 100)}% to ${Math.round(mean(known.map((s) => s.air)) * 100)}%`
      );
    } else {
      notMeasured.push('intimacy — these onsets carry no per-band energies to read proximity from');
    }
  } else {
    notMeasured.push('darkness — these onsets carry no spectrum, so brightness was never measured');
    notMeasured.push('intimacy — these onsets carry no spectrum, so proximity was never measured');
  }

  // --- valence and tension: what the pitch says -------------------------
  let valence: ExpressionDimension | null = null;
  let tension: ExpressionDimension | null = null;
  if (pitched.length >= 3) {
    const ordered = [...pitched].sort((a, b) => a.atSeconds - b.atSeconds);
    const ref = ordered[0].pitchHz as number;
    const st = ordered.map((o) => semitones(o.pitchHz as number, ref));
    // Slope of the line through the phrase, in semitones per second.
    const t = ordered.map((o) => o.atSeconds - ordered[0].atSeconds);
    const tMean = mean(t);
    const stMean = mean(st);
    const denom = t.reduce((a, x) => a + (x - tMean) * (x - tMean), 0);
    const slope = denom > 0 ? t.reduce((a, x, i) => a + (x - tMean) * (st[i] - stMean), 0) / denom : 0;
    // Six semitones a second either way is a decisively rising or falling
    // phrase -- an octave inside two seconds -- and past that the direction is
    // not more positive, only faster. Sung lines move quickly, so a tighter
    // scale than this reads almost every phrase as fully one or the other.
    const rising = clamp01(slope / 12 + 0.5);
    const brightnessN = spectral.length
      ? logScale(mean(spectral.map((o) => o.centroidHz as number)), CENTROID_DARK_HZ, CENTROID_BRIGHT_HZ)
      : null;
    valence = dimension(
      'valence',
      bipolar(brightnessN === null ? rising : 0.6 * rising + 0.4 * brightnessN),
      brightnessN === null
        ? `contour ${slope >= 0 ? 'rises' : 'falls'} ${Math.abs(slope).toFixed(1)} semitones a second across ${ordered.length} pitched onsets`
        : `contour ${slope >= 0 ? 'rises' : 'falls'} ${Math.abs(slope).toFixed(1)} semitones a second, over a ${brightnessN > 0.5 ? 'bright' : 'dark'} spectrum`
    );

    // Unresolved: a wide, restless line that does not come home. Spread is how
    // far the phrase ranges; the ending is how far it stops from where the
    // phrase spent its time.
    const spreadN = clamp01(stdev(st) / 7);
    const home = mean(st);
    const endingAway = clamp01(Math.abs(st[st.length - 1] - home) / 7);
    tension = dimension(
      'tension',
      bipolar(0.5 * spreadN + 0.5 * endingAway),
      `pitch ranges ${stdev(st).toFixed(1)} semitones, ends ${Math.abs(st[st.length - 1] - home).toFixed(1)} semitones from where the phrase sat`
    );
  } else {
    const why =
      pitched.length === 0
        ? 'nothing in this pass carried a pitch'
        : `only ${pitched.length} onset${pitched.length === 1 ? '' : 's'} carried a pitch, and a contour needs three`;
    notMeasured.push(`valence — ${why}`);
    notMeasured.push(`tension — ${why}`);
  }

  return { ...empty, valence, arousal, tension, confidence, intimacy, darkness, movement, notMeasured };
}

/** How much of the state is actually known. Stated, never rounded up. */
export function expressionCoverage(state: ExpressionState | null): { known: number; total: number } {
  if (!state) return { known: 0, total: EXPRESSION_DIMENSIONS.length };
  return {
    known: EXPRESSION_DIMENSIONS.filter((d) => state[d]).length,
    total: EXPRESSION_DIMENSIONS.length,
  };
}

/**
 * The creator's own reading, which replaces the studio's on that dimension.
 *
 * It does not average with the measurement and it does not sit beside it: SRT-1
 * V lists user-specified emotional intent as an input in its own right, and
 * Amendment B.ii puts their perception above the machine's. Passing null for a
 * value hands the dimension back to the measurement.
 */
export function withCreatorReading(
  state: ExpressionState,
  name: ExpressionDimensionName,
  value: number | null,
  measured: ExpressionState
): ExpressionState {
  if (value === null) {
    return { ...state, [name]: measured[name] };
  }
  const [low, high] = EXPRESSION_POLES[name];
  return {
    ...state,
    [name]: {
      ...dimension(name, Math.max(-1, Math.min(1, value)), `you said this take is ${value < 0 ? low : high}`),
      fromCreator: true,
    },
  };
}

/**
 * The state as a sentence a realization can act on.
 *
 * This is what makes it a control variable rather than a readout: it rides
 * with the instruction the way the creator's measured feel already does.
 * Dimensions that were not measured contribute nothing -- an instruction that
 * named all seven regardless would be describing a performance nobody read.
 */
export function describeExpression(state: ExpressionState | null | undefined): string {
  if (!state) return '';
  const parts = EXPRESSION_DIMENSIONS.map((d) => state[d])
    .filter((d): d is ExpressionDimension => !!d && Math.abs(d.value) >= 0.15)
    .map((d) => d.reads);
  return parts.length ? `The performance reads ${parts.join(', ')}.` : '';
}
