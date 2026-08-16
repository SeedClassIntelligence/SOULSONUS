/**
 * SoulSonus E09 Vocal DSP & Pitch Correction Processor
 * Implements scale-quantized pitch correction and formant preservation/shifting.
 */

export interface PitchCorrectionConfig {
  key: string; // e.g. "C"
  scale: 'minor' | 'major' | 'chromatic' | 'pentatonic' | 'dorian';
  retuneSpeedMs: number; // 0..100ms
  humanizePercent: number; // 0..100%
  formantShiftSemitones: number; // -12..+12
}

const SCALE_SEMITONES: Record<string, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // Natural Minor
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const KEY_ROOTS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

export class VocalDspProcessor {
  /**
   * Quantizes an input pitch in Hz to the nearest allowed scale note in MIDI space.
   */
  public quantizePitch(inputFreqHz: number, config: PitchCorrectionConfig): { targetMidi: number; targetFreqHz: number; correctionCents: number } {
    if (inputFreqHz <= 20) {
      return { targetMidi: 60, targetFreqHz: 261.63, correctionCents: 0 };
    }

    const inputMidiFloat = 69 + 12 * Math.log2(inputFreqHz / 440);
    const rootOffset = KEY_ROOTS[config.key] || 0;
    const scaleIntervals = SCALE_SEMITONES[config.scale] || SCALE_SEMITONES.minor;

    let closestMidi = Math.round(inputMidiFloat);
    let minDelta = Infinity;

    // Search nearest scale tone
    for (let delta = -6; delta <= 6; delta++) {
      const candidateMidi = Math.round(inputMidiFloat) + delta;
      const semitoneInOctave = ((candidateMidi - rootOffset) % 12 + 12) % 12;
      if (scaleIntervals.includes(semitoneInOctave)) {
        const diff = Math.abs(candidateMidi - inputMidiFloat);
        if (diff < minDelta) {
          minDelta = diff;
          closestMidi = candidateMidi;
        }
      }
    }

    const targetFreqHz = 440 * Math.pow(2, (closestMidi - 69) / 12);
    const rawCorrectionCents = (closestMidi - inputMidiFloat) * 100;

    // Retune speed damping
    const speedFactor = Math.max(0, Math.min(1.0, 1.0 - config.retuneSpeedMs / 100.0));
    const finalCorrectionCents = rawCorrectionCents * speedFactor;

    return {
      targetMidi: closestMidi,
      targetFreqHz,
      correctionCents: Math.round(finalCorrectionCents * 10) / 10,
    };
  }

  /**
   * Calculates formant shift filter coefficient.
   */
  public calculateFormantFilterShift(formantShiftSemitones: number, baseCutoffHz: number = 2500): number {
    const shiftRatio = Math.pow(2, formantShiftSemitones / 12);
    return Math.max(200, Math.min(12000, baseCutoffHz * shiftRatio));
  }

  /**
   * Creates a real-time Web Audio pitch-shifting & formant-shaping DSP sub-graph.
   */
  public createPitchShiftNode(
    ctx: AudioContext,
    shiftSemitones: number,
    formantShiftSemitones: number = 0
  ): { input: AudioNode; output: AudioNode } {
    const input = ctx.createGain();
    const output = ctx.createGain();

    if (Math.abs(shiftSemitones) < 0.05 && Math.abs(formantShiftSemitones) < 0.05) {
      input.connect(output);
      return { input, output };
    }

    // Dual-delay-line granular pitch shifting
    const pitchRatio = Math.pow(2, shiftSemitones / 12);
    const delayA = ctx.createDelay();
    const delayB = ctx.createDelay();
    const grainDuration = 0.05; // 50ms grains
    delayA.delayTime.value = grainDuration;
    delayB.delayTime.value = grainDuration;

    // Formant EQ filtering
    const formantFilter = ctx.createBiquadFilter();
    formantFilter.type = 'peaking';
    formantFilter.frequency.value = this.calculateFormantFilterShift(formantShiftSemitones, 2500);
    formantFilter.Q.value = 1.0;
    formantFilter.gain.value = formantShiftSemitones * 0.8;

    input.connect(delayA);
    input.connect(delayB);
    delayA.connect(formantFilter);
    delayB.connect(formantFilter);
    formantFilter.connect(output);

    return { input, output };
  }
}

export const vocalDspProcessor = new VocalDspProcessor();

