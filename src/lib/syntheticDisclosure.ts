/**
 * What in this record a machine made, said in the record itself.
 *
 * Clause XVIII.4 asks for synthetic media disclosure to reach the release
 * manifest. Clause XVIII.3 is already honored -- material a model produced is
 * labelled inside the app -- and that is where it stopped. The provenance
 * record shipped with a master listed every track's id, name, role, note count
 * and volume, and said nothing about which of those notes a person played and
 * which a model rendered. A creator handing that file to a distributor, a
 * collaborator or a rights body was handing over a document that could not
 * answer the one question being asked of records like it.
 *
 * Everything below is read off what was already recorded on the material:
 * `NoteProvenance.origin` says who made each note and `renderer` says what
 * rendered it; a track's `originType` says where its sound came from. Nothing
 * is inferred, and a project with no synthetic material gets a sentence saying
 * so rather than an empty object -- an absent disclosure and a disclosure of
 * nothing are different claims.
 */

import type { LayerOriginType, NoteProvenance, Track } from '../types/daw';

/** Note origins that are not the creator's own hand. */
const MACHINE_ORIGINS: NoteProvenance['origin'][] = ['AI_INTERPRETATION', 'SESSION_PLAYER'];

/** Track origins that describe a machine-made sound rather than a recorded one. */
const MACHINE_TRACK_ORIGINS: LayerOriginType[] = [
  'AI_PERFORMANCE_TRANSFER',
  'SYNTHESIS',
  'EXTRACTION_STEM',
];

export interface TrackDisclosure {
  trackId: string;
  trackName: string;
  /** Notes on this track by who or what produced them. */
  notesByOrigin: Record<string, number>;
  /** Notes not played by the creator. */
  machineNotes: number;
  totalNotes: number;
  /** Named renderers, when a note recorded one. */
  renderers: string[];
  /** Session players credited on this track, when any played on it. */
  players: string[];
  /** Where the track's sound came from, when it says. */
  soundOrigin: LayerOriginType | null;
  /** True when anything on this track was made by a machine. */
  synthetic: boolean;
}

export interface SyntheticDisclosure {
  /** One sentence a person can read, true in both directions. */
  statement: string;
  syntheticTracks: number;
  totalTracks: number;
  machineNotes: number;
  totalNotes: number;
  /** Every renderer and player named across the record, deduplicated. */
  renderers: string[];
  players: string[];
  tracks: TrackDisclosure[];
  /**
   * What this disclosure cannot see, named.
   *
   * It reads the provenance recorded on notes and tracks. Audio placed on the
   * timeline from a file carries its own origin on the asset rather than on a
   * note, and a stem separated out of someone else's record is not
   * distinguishable here from one separated out of the creator's own.
   */
  limits: string[];
}

/** Reads the disclosure off the material. Never asserts more than was recorded. */
export function buildSyntheticDisclosure(tracks: Track[]): SyntheticDisclosure {
  const perTrack: TrackDisclosure[] = tracks.map((track) => {
    const notes = track.noteEvents || [];
    const notesByOrigin: Record<string, number> = {};
    const renderers = new Set<string>();
    const players = new Set<string>();
    let machineNotes = 0;

    for (const note of notes) {
      const origin = note.provenance?.origin || 'MANUAL';
      notesByOrigin[origin] = (notesByOrigin[origin] || 0) + 1;
      if (MACHINE_ORIGINS.includes(origin)) machineNotes++;
      if (note.provenance?.renderer) renderers.add(note.provenance.renderer);
      if (note.provenance?.playerRole) players.add(note.provenance.playerRole);
    }

    const soundOrigin = track.originType ?? null;
    return {
      trackId: track.id,
      trackName: track.name,
      notesByOrigin,
      machineNotes,
      totalNotes: notes.length,
      renderers: [...renderers].sort(),
      players: [...players].sort(),
      soundOrigin,
      synthetic:
        machineNotes > 0 || (soundOrigin !== null && MACHINE_TRACK_ORIGINS.includes(soundOrigin)),
    };
  });

  const syntheticTracks = perTrack.filter((t) => t.synthetic).length;
  const machineNotes = perTrack.reduce((n, t) => n + t.machineNotes, 0);
  const totalNotes = perTrack.reduce((n, t) => n + t.totalNotes, 0);
  const renderers = [...new Set(perTrack.flatMap((t) => t.renderers))].sort();
  const players = [...new Set(perTrack.flatMap((t) => t.players))].sort();

  const statement = syntheticTracks
    ? `${syntheticTracks} of ${perTrack.length} track${perTrack.length === 1 ? '' : 's'} in this master ` +
      `contain${syntheticTracks === 1 ? 's' : ''} material produced by a machine` +
      (machineNotes
        ? `: ${machineNotes} of ${totalNotes} notes were not played by the creator`
        : ' as its sound, played from the creator’s own notes') +
      (renderers.length ? `. Rendered by: ${renderers.join(', ')}` : '') +
      (players.length ? `. Session players: ${players.join(', ')}` : '') +
      '.'
    : `No synthetic material. Every note in this master was played by the creator, and no track's ` +
      `sound was produced by a model.`;

  return {
    statement,
    syntheticTracks,
    totalTracks: perTrack.length,
    machineNotes,
    totalNotes,
    renderers,
    players,
    tracks: perTrack,
    limits: [
      'Read from the provenance recorded on notes and tracks; material carrying none is counted as the creator’s.',
      'Audio placed on the timeline carries its origin on the asset rather than on a note, and is not counted here.',
    ],
  };
}
