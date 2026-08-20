/**
 * SoundFont playback, through SpessaSynth.
 *
 * The file this replaces claimed to be a "SpessaSynth Core SF2 Instrument
 * Realizer". It never imported spessasynth_core. `initialize()` logged
 * "Initializing SpessaSynth Core" and set a boolean; `setProgram()` logged
 * "Loaded SF2 Instrument" having loaded nothing; every preset pointed at
 * `/soundfonts/general_midi.sf2`, a file that is not in this repository and
 * never was; and `playNote()` was two oscillators through a biquad filter --
 * a synth wearing a sampler's name, which is precisely the distinction the
 * INSTRUMENT route exists to make against the SYNTH route.
 *
 * This is the real thing. `spessasynth_core` was already a dependency.
 *
 * What it deliberately does not do is ship a sound bank. A General MIDI set
 * is tens of megabytes and carries its own licence; the creator supplies one,
 * and until they do the route says so rather than quietly playing a synth and
 * calling it a Steinway.
 */

import { BasicSoundBank, SoundBankLoader, SpessaSynthProcessor } from 'spessasynth_core';

/** A preset the loaded bank actually contains. Not a list we wrote down. */
export interface SoundFontPreset {
  bank: number;
  program: number;
  name: string;
}

export interface LoadedSoundBank {
  id: string;
  name: string;
  presets: SoundFontPreset[];
  byteLength: number;
}

export interface RenderedNote {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
}

/** Why playback is not possible, as a state rather than an exception. */
export type SoundFontUnavailable = 'NO_BANK_LOADED' | 'PRESET_NOT_IN_BANK';

export class SoundFontUnavailableError extends Error {
  constructor(
    public readonly reason: SoundFontUnavailable,
    message: string
  ) {
    super(message);
    this.name = 'SoundFontUnavailableError';
  }
}

const patchNumber = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

/**
 * Holds one sound bank and renders notes from it.
 *
 * A processor is built per render rather than kept alive, because a render is
 * short and a stale voice pool is a source of leakage between takes.
 */
export class SoundFontEngine {
  private bank: BasicSoundBank | null = null;
  private loaded: LoadedSoundBank | null = null;

  /** The bank the library ships for its own tests: one saw-wave preset, 890 bytes. */
  static builtInSampleBank(): ArrayBuffer {
    return BasicSoundBank.getSampleSoundBankFile();
  }

  /**
   * Loads a .sf2 / .sf3 / .dls file.
   *
   * The preset list comes out of the file. The previous engine carried six
   * hand-written presets with names like "Concert Grand Piano" that no file
   * had ever been consulted for.
   */
  load(buffer: ArrayBuffer, name = 'sound bank'): LoadedSoundBank {
    const bank = SoundBankLoader.fromArrayBuffer(buffer);
    this.bank = bank;
    this.loaded = {
      id: `sf_${Date.now()}`,
      name,
      byteLength: buffer.byteLength,
      presets: bank.presets.map((p: any) => ({
        bank: patchNumber(p.bank),
        program: patchNumber(p.program),
        name: String(p.name ?? 'unnamed'),
      })),
    };
    return this.loaded;
  }

  get isLoaded(): boolean {
    return this.bank !== null;
  }

  get current(): LoadedSoundBank | null {
    return this.loaded;
  }

  unload(): void {
    this.bank = null;
    this.loaded = null;
  }

  /**
   * Renders one note to stereo buffers.
   *
   * `holdSeconds` is how long the key is held; `tailSeconds` is how much of
   * the release to keep after it lifts. A sampled instrument's release is part
   * of its character, so cutting it at note-off would make every preset sound
   * like the same abrupt thing.
   */
  async renderNote(opts: {
    midiNote: number;
    velocity?: number;
    holdSeconds?: number;
    tailSeconds?: number;
    program?: number;
    bank?: number;
    sampleRate?: number;
  }): Promise<RenderedNote> {
    if (!this.bank) {
      throw new SoundFontUnavailableError(
        'NO_BANK_LOADED',
        'No sound bank is loaded. Import a .sf2 file to play sampled instruments.'
      );
    }
    const sampleRate = opts.sampleRate ?? 44100;
    const hold = Math.max(0.05, opts.holdSeconds ?? 0.5);
    const tail = Math.max(0, opts.tailSeconds ?? 0.5);
    const program = opts.program ?? 0;
    const bankNum = opts.bank ?? 0;

    if (this.loaded && !this.loaded.presets.some((p) => p.program === program)) {
      throw new SoundFontUnavailableError(
        'PRESET_NOT_IN_BANK',
        `This sound bank has no program ${program}. It contains: ${this.loaded.presets
          .map((p) => `${p.name} (${p.program})`)
          .join(', ')}.`
      );
    }

    const synth = new SpessaSynthProcessor(sampleRate, { eventsEnabled: false });
    await synth.processorInitialized;
    synth.soundBankManager.addSoundBank(this.bank, 'main');
    synth.programChange(0, program);
    if (bankNum) synth.controllerChange?.(0, 0, bankNum);

    const total = Math.ceil((hold + tail) * sampleRate);
    const holdSamples = Math.floor(hold * sampleRate);
    const left = new Float32Array(total);
    const right = new Float32Array(total);

    // The processor renders in blocks; note-off has to land on a block
    // boundary inside the render, not before it starts, or the release is the
    // only thing captured.
    const BLOCK = 128;
    let released = false;
    for (let i = 0; i < total; i += BLOCK) {
      if (!released && i >= holdSamples) {
        synth.noteOff(0, opts.midiNote);
        released = true;
      }
      if (i === 0) synth.noteOn(0, opts.midiNote, Math.max(1, Math.min(127, opts.velocity ?? 100)));
      synth.process(left, right, i, Math.min(BLOCK, total - i));
    }

    return { left, right, sampleRate };
  }

  /**
   * Renders a whole sequence of notes in one pass.
   *
   * One processor for the sequence rather than one per note, because a
   * sampled instrument's voices overlap: the release of one note sounds
   * underneath the attack of the next, and rendering notes separately and
   * summing them would lose the voice stealing the instrument actually does.
   */
  async renderSequence(opts: {
    notes: { midiNote: number; startSeconds: number; durationSeconds: number; velocity?: number }[];
    program?: number;
    sampleRate?: number;
    tailSeconds?: number;
  }): Promise<RenderedNote & { notesRendered: number }> {
    if (!this.bank) {
      throw new SoundFontUnavailableError(
        'NO_BANK_LOADED',
        'No sound bank is loaded. Import a .sf2 file to render this track as a sampled instrument.'
      );
    }
    const sampleRate = opts.sampleRate ?? 44100;
    const program = opts.program ?? 0;
    const tail = Math.max(0.2, opts.tailSeconds ?? 1.5);

    if (this.loaded && !this.loaded.presets.some((p) => p.program === program)) {
      throw new SoundFontUnavailableError(
        'PRESET_NOT_IN_BANK',
        `This sound bank has no program ${program}. It contains: ${this.loaded.presets
          .map((p) => `${p.name} (${p.program})`)
          .join(', ')}.`
      );
    }

    const end = opts.notes.reduce((m, n) => Math.max(m, n.startSeconds + n.durationSeconds), 0);
    const total = Math.ceil((end + tail) * sampleRate);
    const left = new Float32Array(total);
    const right = new Float32Array(total);
    if (!opts.notes.length) return { left, right, sampleRate, notesRendered: 0 };

    const synth = new SpessaSynthProcessor(sampleRate, { eventsEnabled: false });
    await synth.processorInitialized;
    synth.soundBankManager.addSoundBank(this.bank, 'main');
    synth.programChange(0, program);

    // Events on a sample timeline, applied as the render passes them.
    const events: { at: number; on: boolean; note: number; velocity: number }[] = [];
    for (const n of opts.notes) {
      events.push({ at: Math.floor(n.startSeconds * sampleRate), on: true, note: n.midiNote, velocity: n.velocity ?? 100 });
      events.push({
        at: Math.floor((n.startSeconds + Math.max(0.02, n.durationSeconds)) * sampleRate),
        on: false,
        note: n.midiNote,
        velocity: 0,
      });
    }
    events.sort((a, b) => a.at - b.at);

    const BLOCK = 128;
    let next = 0;
    let rendered = 0;
    for (let i = 0; i < total; i += BLOCK) {
      while (next < events.length && events[next].at <= i) {
        const e = events[next++];
        if (e.on) {
          synth.noteOn(0, e.note, Math.max(1, Math.min(127, e.velocity)));
          rendered++;
        } else {
          synth.noteOff(0, e.note);
        }
      }
      synth.process(left, right, i, Math.min(BLOCK, total - i));
    }
    return { left, right, sampleRate, notesRendered: rendered };
  }
}

export const soundFontEngine = new SoundFontEngine();
