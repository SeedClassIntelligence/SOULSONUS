/**
 * The two band roles a generative renderer can actually fill.
 *
 * Five of the seven session-band roles hand back notes (`sessionBand.ts`
 * `TakeKind: 'performance'`), checked against the grant by arithmetic on
 * `NoteEvent[]`. ACE-Step hands back audio, not notes -- there is no
 * symbolic form of a stacked "ooh" or a riser for it to return -- so it can
 * only ever stand behind the two roles that already hand back audio:
 * BACKING_VOCALS and TEXTURE. `installDefaultBand()` registers nothing for
 * those two and says so honestly ("genuinely wait on a generative
 * renderer"). This is that renderer, wired through the same seam as every
 * other player -- `callSessionPlayer` -- not a second, parallel path.
 */

import { BandBrief, BandTake, BandRole, playerFor } from './sessionBand';
import { PlayerAvailability, PlayOptions, SessionPlayer, SessionRoom } from './sessionPlayer';
import { getE05Provider } from './inference/e05Provider';

export class AcePlayer implements SessionPlayer {
  readonly renderer = 'ace-step-1.5';
  readonly hands = 'audio' as const;
  readonly label: string;

  constructor(readonly role: BandRole) {
    this.label = playerFor(role).label;
  }

  async availability(brief: BandBrief): Promise<PlayerAvailability> {
    if (!brief.direction.trim()) {
      return {
        available: false,
        reason: 'NO_SOURCE',
        detail: `Say what you want the ${this.label.toLowerCase()} to do — this player generates from your direction, and none was given.`,
      };
    }
    const status = await getE05Provider().status();
    if (!status.available) {
      return {
        available: false,
        reason: 'SERVICE_UNAVAILABLE',
        detail: status.detail || `The realization host is not reachable, so no ${this.label.toLowerCase()} take can be made right now.`,
      };
    }
    return { available: true };
  }

  async play(brief: BandBrief, room: SessionRoom, opts?: PlayOptions): Promise<BandTake> {
    // Honest about what this can hear: no rendered mix of the session is
    // wired into `room.reference` yet, so this generates from the creator's
    // own words alone rather than actually listening to the band. Real,
    // working audio -- just not yet the "hears the song, not a description
    // of it" standard the rest of the band is held to. `room.bpm` at least
    // keeps it in tempo with everyone else.
    const bars = brief.grant.bars;
    const barsCount = bars ? Math.max(1, bars[1] - bars[0] + 1) : 4;
    const durationSeconds = Math.max(4, Math.round((barsCount * 4 * 60) / Math.max(1, room.bpm)));

    const realization = await getE05Provider().realize(
      {
        task: 'text2music',
        instruction: brief.direction,
        prompt: brief.direction,
        durationSeconds,
        seed: opts?.seed,
      },
      { signal: opts?.signal }
    );

    return {
      kind: 'audio',
      role: this.role,
      audio: realization.audio,
      description:
        `Generated ${durationSeconds}s from "${brief.direction}" by ${realization.resolvedModel || this.renderer}. ` +
        `This player doesn't hear the rest of the session yet, only your direction.`,
    };
  }
}

/** Fills the two audio-handing seats the note players cannot. Additive to installDefaultBand(). */
export function installAcePlayers(register: (player: SessionPlayer) => void) {
  register(new AcePlayer('BACKING_VOCALS'));
  register(new AcePlayer('TEXTURE'));
}
