/**
 * The sounds a creator can hear the moment they open the studio.
 *
 * These are not files. They are the studio's own instrument voices -- the same
 * Tone.js definitions the tracks play, from `instrumentVoices.ts` -- rendered
 * live when you audition them. That is deliberate, and it settles three things
 * at once:
 *
 *   Nothing can go missing. There is no path to fetch, so there is no dead
 *   reference to discover with your finger on the button.
 *
 *   What you audition is what you get. The vault used to preview one generic
 *   synth while the track played another, so the two could drift and did.
 *   Both now come through this module, off the same constants.
 *
 *   The licence is true. Tone.js is MIT, and that is a real statement about
 *   real code -- not a licence asserted over audio that was never there.
 *
 * A creator's own recordings are a different thing and stay a different thing.
 * These are the house instruments; those are their roots.
 */

import * as Tone from 'tone';
import {
  KICK_OPTIONS,
  SNARE_OPTIONS,
  HIHAT_OPTIONS,
  HIHAT_FREQUENCY,
  MELODY_OPTIONS,
  BASS_OPTIONS,
} from './instrumentVoices';

export type StarterVoiceId = 'kick' | 'snare' | 'hihat' | 'bass' | 'melody';

export interface StarterVoice {
  id: StarterVoiceId;
  name: string;
  /** What it is, in the creator's terms, not the synth's. */
  gesture: string;
  /** The Tone class behind it, named so the claim can be checked. */
  engine: string;
  licence: 'MIT (Tone.js)';
  /** Pitch it auditions at, and roughly where it sits. Null when unpitched. */
  pitch: string | null;
  approxHz: number;
}

export const STARTER_VOICES: StarterVoice[] = [
  {
    id: 'kick',
    name: 'Studio Kick',
    gesture: 'Deep "boom" mouth thump',
    engine: 'Tone.MembraneSynth',
    licence: 'MIT (Tone.js)',
    // Triggered at C1. It does not sit there: octaves=8 with pitchDecay=0.05
    // sweeps the attack from far above and settles down onto the fundamental,
    // so a spectrum taken at the loudest instant reads 129-172 Hz, not 33. The
    // note it is played at is the honest number to show; the sweep is what a
    // kick is.
    pitch: 'C1',
    approxHz: 33,
  },
  {
    id: 'snare',
    name: 'Studio Snare',
    gesture: 'Sharp "pff" lip pop',
    engine: 'Tone.NoiseSynth',
    licence: 'MIT (Tone.js)',
    pitch: null,
    approxHz: 0,
  },
  {
    id: 'hihat',
    name: 'Studio Hi-Hat',
    gesture: '"Tss" teeth hiss',
    engine: 'Tone.MetalSynth',
    licence: 'MIT (Tone.js)',
    pitch: null,
    approxHz: HIHAT_FREQUENCY,
  },
  {
    id: 'bass',
    name: 'Studio Sub Bass',
    gesture: 'Chest-voice "dum"',
    engine: 'Tone.MonoSynth',
    licence: 'MIT (Tone.js)',
    pitch: 'C2',
    approxHz: 65,
  },
  {
    id: 'melody',
    name: 'Studio Lead',
    gesture: 'Hummed melody line',
    engine: 'Tone.FMSynth',
    licence: 'MIT (Tone.js)',
    pitch: 'C4',
    approxHz: 262,
  },
];

export const starterVoiceById = (id: StarterVoiceId): StarterVoice | undefined =>
  STARTER_VOICES.find((v) => v.id === id);

/**
 * Sounds one starter voice and then takes it back down.
 *
 * The previous audition path built a MembraneSynth on every press and then, for
 * anything that was not a kick, built a second synth and let the first one go
 * un-disposed -- so a browse through the library left a synth behind for each
 * sound looked at. Each voice here is built, triggered, and disposed once its
 * release has finished.
 */
export async function auditionStarterVoice(id: StarterVoiceId): Promise<void> {
  await Tone.start();

  const dispose = (node: { dispose: () => void }, afterMs: number) => {
    window.setTimeout(() => {
      try {
        node.dispose();
      } catch {
        // Already torn down with the context. Nothing to recover.
      }
    }, afterMs);
  };

  if (id === 'kick') {
    const v = new Tone.MembraneSynth(KICK_OPTIONS).toDestination();
    v.triggerAttackRelease('C1', '8n');
    dispose(v, 1200);
    return;
  }
  if (id === 'snare') {
    const v = new Tone.NoiseSynth(SNARE_OPTIONS).toDestination();
    v.triggerAttackRelease('16n');
    dispose(v, 800);
    return;
  }
  if (id === 'hihat') {
    const v = new Tone.MetalSynth(HIHAT_OPTIONS).toDestination();
    // The engine sets this voice's frequency to HIHAT_FREQUENCY rather than
    // playing it from a note, so the audition triggers the same number. A note
    // name here would preview a hi-hat the tracks never play.
    v.triggerAttackRelease(HIHAT_FREQUENCY, '32n');
    dispose(v, 600);
    return;
  }
  if (id === 'bass') {
    const v = new Tone.MonoSynth(BASS_OPTIONS).toDestination();
    v.triggerAttackRelease('C2', '4n');
    dispose(v, 1600);
    return;
  }
  const v = new Tone.FMSynth(MELODY_OPTIONS).toDestination();
  v.triggerAttackRelease('C4', '4n');
  dispose(v, 1600);
}
