/**
 * Offline bounce of the project through the master bus.
 *
 * This is the buffer everything downstream needs: real loudness measurement
 * needs audio to measure, and real export needs audio to encode. Both used to
 * be impossible for the same reason — nothing ever rendered the project.
 *
 * The graph mirrors live playback exactly (same voices, same per-track strips,
 * same mix bus) and then runs the same mastering chain the Master room edits,
 * so the measured and exported result is what the creator actually hears.
 */

import * as Tone from 'tone';
import { MasteringDspChain, Track } from '../types/daw';
import { buildMasteringChain } from './masteringChain';
import {
  BASS_OPTIONS,
  HIHAT_FREQUENCY,
  HIHAT_OPTIONS,
  KICK_OPTIONS,
  MELODY_OPTIONS,
  SNARE_OPTIONS,
  defaultFilterFreqFor,
} from './instrumentVoices';
import { midiToNoteName, tickToStep } from '../utils/musicMath';

export interface RenderOptions {
  tracks: Track[];
  bpm: number;
  chain: MasteringDspChain;
  /** Bars to render. The note grid is four bars. */
  bars?: number;
  sampleRate?: number;
  /** Extra seconds so reverb and release tails are not cut off. */
  tailSeconds?: number;
}

export interface RenderResult {
  buffer: AudioBuffer;
  durationSeconds: number;
  sampleRate: number;
  /** Voices actually triggered — zero means the project is silent. */
  eventsRendered: number;
}

const STEPS_PER_BAR = 16;

/** Renders the project to an AudioBuffer. Deterministic: same input, same output. */
export async function renderMasterBounce(options: RenderOptions): Promise<RenderResult> {
  const { tracks, chain } = options;
  const bpm = options.bpm > 0 ? options.bpm : 110;
  const bars = options.bars ?? 4;
  const sampleRate = options.sampleRate ?? 48000;
  const tail = options.tailSeconds ?? 2.5;

  const secondsPerBeat = 60 / bpm;
  const secondsPerStep = secondsPerBeat / 4;
  const totalSteps = bars * STEPS_PER_BAR;
  const bodySeconds = totalSteps * secondsPerStep;
  const duration = bodySeconds + tail;

  let eventsRendered = 0;
  const hasSolo = tracks.some((t) => t.solo);

  const rendered = await Tone.Offline(async () => {
    const master = buildMasteringChain(chain);
    master.output.toDestination();

    // Mix bus, matching the live engine's master compressor and volume.
    const mixVolume = new Tone.Volume(0).connect(master.input);
    const mixComp = new Tone.Compressor({ threshold: -12, ratio: 4, attack: 0.003, release: 0.25 }).connect(mixVolume);

    const reverb = new Tone.Reverb({ decay: 2.2, wet: 1 });
    await reverb.generate();
    reverb.connect(mixComp);

    // One channel strip per track, mirroring getOrCreateTrackNodes.
    const strips = new Map<string, { filter: Tone.Filter; send: Tone.Gain }>();
    for (const track of tracks) {
      const filter = new Tone.Filter({
        frequency: track.dspSettings?.filterFreq || defaultFilterFreqFor(track.instrument),
        type: track.dspSettings?.filterType || 'lowpass',
      });
      const compressor = new Tone.Compressor({
        threshold: track.dspSettings?.compressorThreshold ?? -18,
        ratio: track.dspSettings?.compressorRatio ?? 4,
        attack: 0.005,
        release: 0.1,
      });
      const channel = new Tone.Channel({
        volume: track.volume || 0,
        pan: track.dspSettings?.pan || 0,
        mute: false,
      });
      const send = new Tone.Gain(track.dspSettings?.reverbSend ?? (track.instrument === 'melody' ? 0.25 : 0));

      filter.connect(compressor);
      compressor.connect(channel);
      channel.connect(mixComp);
      compressor.connect(send);
      send.connect(reverb);

      strips.set(track.id, { filter, send });
    }

    // A small round-robin voice pool per track. One voice per track is enough
    // for pitch, but a single envelope rejects a retrigger that arrives before
    // its previous release has finished — which percussion routinely does. The
    // pool lets consecutive hits overlap the way they do when played.
    const VOICES_PER_TRACK = 4;
    type Voice = Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth | Tone.FMSynth | Tone.MonoSynth;
    const makeVoice = (instrument: Track['instrument']): Voice => {
      switch (instrument) {
        case 'kick': return new Tone.MembraneSynth(KICK_OPTIONS);
        case 'snare': return new Tone.NoiseSynth(SNARE_OPTIONS);
        case 'hihat': {
          const h = new Tone.MetalSynth(HIHAT_OPTIONS);
          h.frequency.value = HIHAT_FREQUENCY;
          return h;
        }
        case 'bass': return new Tone.MonoSynth(BASS_OPTIONS);
        default: return new Tone.FMSynth(MELODY_OPTIONS);
      }
    };

    const pools = new Map<string, { voices: Voice[]; next: number }>();
    for (const track of tracks) {
      const strip = strips.get(track.id);
      if (!strip) continue;
      const voices: Voice[] = [];
      for (let i = 0; i < VOICES_PER_TRACK; i++) {
        const v = makeVoice(track.instrument);
        v.connect(strip.filter);
        voices.push(v);
      }
      pools.set(track.id, { voices, next: 0 });
    }

    const triggerAt = (track: Track, pitch: string, when: number, velocity: number, durSec: number) => {
      const pool = pools.get(track.id);
      if (!pool) return;
      const voice = pool.voices[pool.next % pool.voices.length];
      pool.next++;
      eventsRendered++;
      if (voice instanceof Tone.NoiseSynth) {
        // NoiseSynth is an Instrument: (duration, time, velocity).
        voice.triggerAttackRelease(durSec, when, velocity);
      } else if (voice instanceof Tone.MetalSynth) {
        // MetalSynth is Monophonic: (note, duration, time, velocity).
        voice.triggerAttackRelease(HIHAT_FREQUENCY, durSec, when, velocity);
      } else {
        voice.triggerAttackRelease(pitch, durSec, when, velocity);
      }
    };

    for (const track of tracks) {
      if (track.mute) continue;
      if (hasSolo && !track.solo) continue;

      if (track.noteEvents && track.noteEvents.length > 0) {
        // These voices are monophonic, exactly as in live playback, so a track
        // can only sound one note at a time. Where several notes share a start
        // tick the loudest wins — which is what retriggering a mono synth does
        // anyway — and events must be scheduled in chronological order.
        const loudestPerTick = new Map<number, (typeof track.noteEvents)[number]>();
        for (const ev of track.noteEvents) {
          const step = tickToStep(ev.startTick);
          if (step < 0 || step >= totalSteps) continue;
          const existing = loudestPerTick.get(ev.startTick);
          if (!existing || ev.velocity > existing.velocity) loudestPerTick.set(ev.startTick, ev);
        }

        const ordered = [...loudestPerTick.values()].sort((a, b) => a.startTick - b.startTick);
        for (let i = 0; i < ordered.length; i++) {
          const ev = ordered[i];
          const when = (ev.startTick / 480) * secondsPerBeat;
          const requested = (ev.durationTicks / 480) * secondsPerBeat;
          // A mono voice's release has to land before the next attack, or the
          // envelope events arrive out of order and scheduling is rejected.
          const next = ordered[i + 1];
          const gap = next ? (next.startTick - ev.startTick) / 480 * secondsPerBeat : Infinity;
          const durSec = Math.max(0.02, Math.min(requested, gap - 0.005));
          const velocity = Math.max(0.05, Math.min(1, ev.velocity / 127));
          triggerAt(track, midiToNoteName(ev.midiNote), when, velocity, durSec);
        }
      } else {
        const activeSteps: number[] = [];
        for (let step = 0; step < totalSteps && step < track.steps.length; step++) {
          if (track.steps[step]) activeSteps.push(step);
        }
        for (let i = 0; i < activeSteps.length; i++) {
          const step = activeSteps[i];
          const when = step * secondsPerStep;
          const nextStep = activeSteps[i + 1];
          const gap = nextStep !== undefined ? (nextStep - step) * secondsPerStep : Infinity;
          const pitch =
            track.instrument === 'bass' || track.instrument === 'melody'
              ? track.notes?.[step] || track.pitch || 'C3'
              : track.pitch || 'C2';
          triggerAt(track, pitch, when, 0.8, Math.max(0.02, Math.min(secondsPerStep * 0.9, gap - 0.005)));
        }
      }
    }


  }, duration, 2, sampleRate);

  return {
    buffer: rendered.get() as AudioBuffer,
    durationSeconds: duration,
    sampleRate,
    eventsRendered,
  };
}
