/**
 * A sampled instrument that plays live.
 *
 * The factory kit could already be rendered onto the timeline: notes in, an
 * audio clip out. That is what a sampler does, but it is not what an
 * instrument does. A creator beatboxing over their track heard the
 * synthesised kick while the sampled one existed only after a render, which
 * makes the good sound something you commit to rather than something you
 * play.
 *
 * SpessaSynth renders in blocks rather than as a Web Audio node, so it cannot
 * be dropped into the graph and played. What it can do is render each zone
 * once, ahead of time, into a buffer -- and a drum is a one-shot, so a buffer
 * per zone is the whole instrument. Sixteen buffers, built at load, played
 * through the same channel strip as every other voice.
 *
 * The velocity law here was measured rather than looked up. Inside a single
 * band of the kick, where the sample cannot change, the engine's peak output
 * against velocity is:
 *
 *     v96  0.14564   v104 0.16915   v112 0.19646   v120 0.22556   v127 0.25309
 *
 * which is (v/127)^2 to within 0.7%. So each zone is rendered once at the top
 * of its band and scaled by the square of the velocity ratio, and a hit is
 * both the right recording and the right loudness.
 */

export interface SampledZone {
  key: number;
  velMin: number;
  velMax: number;
  /** The sample behind this zone, for anything that has to explain itself. */
  name: string;
  buffer: AudioBuffer;
}

/** What a zone was rendered at, and how a quieter hit is derived from it. */
const velocityGain = (velocity: number, renderedAt: number) => {
  const v = Math.max(1, Math.min(127, velocity));
  const ref = Math.max(1, Math.min(127, renderedAt));
  return (v * v) / (ref * ref);
};

export class SampledInstrument {
  constructor(
    readonly name: string,
    private readonly zones: SampledZone[]
  ) {}

  get zoneCount(): number {
    return this.zones.length;
  }

  /** The keys this instrument covers. */
  keys(): number[] {
    return [...new Set(this.zones.map((z) => z.key))].sort((a, b) => a - b);
  }

  /**
   * The recording a hit of this velocity lands on, and what to play it at.
   *
   * Null when the instrument has nothing on that key, which is a real answer:
   * the caller falls back to its synthesised voice rather than playing the
   * nearest thing and calling it the kit.
   */
  select(key: number, midiVelocity: number): { zone: SampledZone; gain: number } | null {
    const v = Math.max(1, Math.min(127, Math.round(midiVelocity)));
    const zone =
      this.zones.find((z) => z.key === key && v >= z.velMin && v <= z.velMax) ||
      this.zones.filter((z) => z.key === key).sort((a, b) => b.velMax - a.velMax)[0];
    if (!zone) return null;
    return { zone, gain: velocityGain(v, zone.velMax) };
  }

  /** Total decoded audio held, in seconds. Memory, stated rather than guessed at. */
  seconds(): number {
    return this.zones.reduce((n, z) => n + z.buffer.duration, 0);
  }
}

/** Where the last audible sample sits, so silence is not stored. */
function usefulLength(channel: Float32Array, floor = 10 ** (-70 / 20)): number {
  let end = channel.length;
  while (end > 0 && Math.abs(channel[end - 1]) < floor) end--;
  return end;
}

export interface ZoneSpec {
  key: number;
  velMin: number;
  velMax: number;
  name: string;
}

/**
 * Renders every zone once and holds the result.
 *
 * `render` is the bank's own note renderer, passed in rather than imported so
 * this file has no opinion about which engine produced the audio -- an SFZ
 * player later hands it the same shape.
 */
export async function prepareSampledInstrument(
  name: string,
  specs: ZoneSpec[],
  render: (key: number, velocity: number) => Promise<{ left: Float32Array; right: Float32Array; sampleRate: number }>,
  context: BaseAudioContext
): Promise<SampledInstrument> {
  const zones: SampledZone[] = [];
  for (const spec of specs) {
    const rendered = await render(spec.key, spec.velMax);
    const length = Math.max(
      usefulLength(rendered.left),
      usefulLength(rendered.right),
      Math.round(rendered.sampleRate * 0.01)
    );
    const buffer = context.createBuffer(2, length, rendered.sampleRate);
    buffer.copyToChannel(rendered.left.subarray(0, length), 0);
    buffer.copyToChannel(rendered.right.subarray(0, length), 1);
    zones.push({ key: spec.key, velMin: spec.velMin, velMax: spec.velMax, name: spec.name, buffer });
  }
  return new SampledInstrument(name, zones);
}

/**
 * The kit the studio is playing, in one place.
 *
 * Live playback, the master bounce, the stems and the masking analysis all
 * have to agree about what a drum channel sounds like. Held here rather than
 * inside the live engine so the offline renderers can read it without
 * reaching into the engine, and so there is one answer rather than four
 * copies that drift.
 */
export interface LoadedKit {
  instrument: SampledInstrument;
  /** Which key each of this studio's channel types plays on. */
  keyMap: Record<string, number>;
}

let currentKit: LoadedKit | null = null;

export const setCurrentSampledKit = (kit: LoadedKit | null) => {
  currentKit = kit;
};

export const getCurrentSampledKit = (): LoadedKit | null => currentKit;
