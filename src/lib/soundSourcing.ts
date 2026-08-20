/**
 * Where sounds come from, and what is allowed to become one.
 *
 * The sourcing approach used to be a list of libraries named one at a time. It
 * is now a funnel: a curated catalogue is the only way in, and the libraries
 * compete for a limited number of factory slots. This file is that decision,
 * written so code can enforce it rather than a document nobody reads.
 *
 * The stack the decision settles on:
 *
 *   discovery and rights curation  →  the curated catalogue below
 *   playback                       →  SpessaSynth (SF2/DLS) + sfizz (SFZ)
 *   factory sounds                 →  the best of the catalogue, slot-limited
 *   native synthesis               →  the SoulSonus synth families
 *   DSP                            →  FaustWasm, selected permissive
 *                                     algorithms, and the existing chain
 *   generative realization         →  ACE
 *   the Session Band               →  plays through any of the above
 *
 * The load-bearing rule is `factoryAdmission`. A sound cannot occupy a factory
 * slot unless the source is cleared for redistribution *and* someone on this
 * project has read the licence at the source. Believing a library is
 * permissively licensed is not the same as having checked, and this project
 * has already shipped a vault where every row was badged COMMERCIAL APPROVED
 * against admission records that did not exist. So `rightsVerified` starts
 * false for everything nobody has actually verified, and the guard refuses on
 * it. That is not pessimism about the licences; it is the difference between
 * a belief and a fact, kept visible.
 */

import { ResourceAdmissionRecord } from '../types/daw';

export type SourceRole =
  /** Plays formats other people authored. */
  | 'PLAYBACK_RUNTIME'
  /** A toolchain we build instruments and processors with. */
  | 'BUILD_TOOLCHAIN'
  /** Ideas read and adapted. The code is not embedded. */
  | 'ALGORITHM_SOURCE'
  /** Generative realization and transformation. Not a sample library. */
  | 'GENERATIVE'
  /** Recorded instruments that could occupy a factory slot. */
  | 'INSTRUMENT_LIBRARY'
  /** Sounds we synthesise ourselves. */
  | 'NATIVE_SYNTHESIS'
  /** Processing that already ships. */
  | 'PROCESSING';

export type SourceStanding =
  /** Shipping in the product today. */
  | 'IN_USE'
  /** Decided and kept, not built yet. */
  | 'ADOPT'
  /** Competes for a factory slot through the catalogue. */
  | 'FACTORY_CANDIDATE'
  /** Admitted only to fill gaps nothing better covers. */
  | 'FALLBACK_ONLY'
  /** Read it, learn from it, do not ship it. */
  | 'REFERENCE_ONLY'
  /** Ruled out, with a reason. */
  | 'EXCLUDED';

export interface SourceDecision {
  id: string;
  name: string;
  role: SourceRole;
  standing: SourceStanding;
  /** Why, in the terms the decision was actually made in. */
  reason: string;
  /**
   * True only when someone on this project has read the licence at the source
   * and recorded what it permits. Never set from recollection.
   */
  rightsVerified: boolean;
  /** What still has to be established before this could be verified. */
  rightsNote?: string;
}

export const SOURCE_POLICY: readonly SourceDecision[] = [
  // --- runtime: what actually makes the sound ---
  {
    id: 'spessasynth',
    name: 'SpessaSynth',
    role: 'PLAYBACK_RUNTIME',
    standing: 'IN_USE',
    reason: 'The SoundFont/DLS runtime in the browser. Already the dependency behind the INSTRUMENT route.',
    rightsVerified: true,
    rightsNote: 'Shipped as an npm dependency of this project, not as redistributed content.',
  },
  {
    id: 'sfizz',
    name: 'sfizz',
    role: 'PLAYBACK_RUNTIME',
    standing: 'ADOPT',
    reason: 'The richer SFZ/multisample runtime. Preferred where an instrument is authored as SFZ.',
    rightsVerified: false,
    rightsNote: 'The runtime licence and its browser build path have not been read at the source yet.',
  },
  {
    id: 'faustwasm',
    name: 'FaustWasm',
    role: 'BUILD_TOOLCHAIN',
    standing: 'ADOPT',
    reason: 'The best route to SoulSonus-native browser DSP and instruments.',
    rightsVerified: false,
    rightsNote: 'Toolchain licence and the licence of anything it compiles both still to be established.',
  },
  {
    id: 'airwindows',
    name: 'Airwindows',
    role: 'ALGORITHM_SOURCE',
    standing: 'REFERENCE_ONLY',
    reason:
      'Kept as a source of permissive DSP ideas, selectively adapted. Not adopted as a plugin collection.',
    rightsVerified: false,
    rightsNote: 'Each algorithm adapted needs its own licence read before the adaptation ships.',
  },
  {
    id: 'ace-step-xl-base',
    name: 'ACE-Step XL Base',
    role: 'GENERATIVE',
    standing: 'ADOPT',
    reason: 'E05 generative realization and transformation. Explicitly not a sample library.',
    rightsVerified: false,
    rightsNote: 'Model and output licensing to be established before anything it renders is redistributed.',
  },
  {
    id: 'soulsonus-synths',
    name: 'SoulSonus native synths',
    role: 'NATIVE_SYNTHESIS',
    standing: 'IN_USE',
    reason: 'Sub/mono, poly, FM and percussion/noise families. Ours, so no sourcing question at all.',
    rightsVerified: true,
  },
  {
    id: 'soulsonus-mastering',
    name: 'The existing mastering chain',
    role: 'PROCESSING',
    standing: 'IN_USE',
    reason:
      'EQ, dynamics, saturation, imager, clipper and true-peak all work. Kept and hardened rather than replaced to chase external plugins.',
    rightsVerified: true,
  },

  // --- libraries competing for factory slots ---
  {
    id: 'vcsl',
    name: 'Versilian Community Sample Library',
    role: 'INSTRUMENT_LIBRARY',
    standing: 'FACTORY_CANDIDATE',
    reason:
      'One strong library inside the curated catalogue, no longer the sourcing strategy by itself.',
    rightsVerified: false,
    rightsNote: 'Licence terms not yet read at the source and recorded here.',
  },
  {
    id: 'karoryfer',
    name: 'Karoryfer instruments',
    role: 'INSTRUMENT_LIBRARY',
    standing: 'FACTORY_CANDIDATE',
    reason: 'Selected basses and other instruments may earn factory slots through the catalogue.',
    rightsVerified: false,
    rightsNote: 'Per-instrument terms vary; each candidate needs its own reading.',
  },
  {
    id: 'virtuosity-drums',
    name: 'Virtuosity Drums',
    role: 'INSTRUMENT_LIBRARY',
    standing: 'FACTORY_CANDIDATE',
    reason:
      'A candidate for the factory acoustic kit, evaluated against the other curated drum libraries rather than declared the winner.',
    rightsVerified: false,
    rightsNote: 'Licence not yet read at the source.',
  },
  {
    id: 'musescore-general',
    name: 'MuseScore General',
    role: 'INSTRUMENT_LIBRARY',
    standing: 'FALLBACK_ONLY',
    reason:
      'General MIDI coverage for families nothing better fills. Not a flagship sonic source.',
    rightsVerified: false,
    rightsNote: 'Licence not yet read at the source.',
  },

  // --- kept at arm's length ---
  {
    id: 'smplr',
    name: 'smplr',
    role: 'PLAYBACK_RUNTIME',
    standing: 'REFERENCE_ONLY',
    reason:
      'A useful browser implementation to read. Not needed if SpessaSynth and sfizz cover the runtime cleanly.',
    rightsVerified: false,
  },
  {
    id: 'openair',
    name: 'OpenAIR impulse responses',
    role: 'INSTRUMENT_LIBRARY',
    standing: 'EXCLUDED',
    reason:
      'Per-asset licences complicate bundling. Individual IRs only if the rights to that one file are unambiguous.',
    rightsVerified: false,
  },
  {
    id: 'philharmonia',
    name: 'Philharmonia sample library',
    role: 'INSTRUMENT_LIBRARY',
    standing: 'EXCLUDED',
    reason: 'Fine for a creator to use under its own terms. Not for factory redistribution.',
    rightsVerified: false,
  },
  {
    id: 'pianobook',
    name: 'Pianobook',
    role: 'INSTRUMENT_LIBRARY',
    standing: 'EXCLUDED',
    reason: 'Not bundled, and not repackaged into the exchange.',
    rightsVerified: false,
  },
  {
    id: 'freesound',
    name: 'Freesound',
    role: 'INSTRUMENT_LIBRARY',
    standing: 'EXCLUDED',
    reason:
      'Not a factory library. Possible later as optional discovery, with licensing resolved per asset at the point of use.',
    rightsVerified: false,
  },
  {
    id: 'pedalboard',
    name: 'Spotify Pedalboard',
    role: 'PROCESSING',
    standing: 'EXCLUDED',
    reason: 'GPL and licensing complexity buys nothing the browser product needs.',
    rightsVerified: false,
  },
  {
    id: 'rubberband',
    name: 'Rubber Band',
    role: 'PROCESSING',
    standing: 'EXCLUDED',
    reason:
      'Not embedded open-source by default. Reconsidered only under a commercial licence, if its quality becomes necessary.',
    rightsVerified: false,
  },
  {
    id: 'surge-xt',
    name: 'Surge XT',
    role: 'NATIVE_SYNTHESIS',
    standing: 'EXCLUDED',
    reason:
      'A useful reference, but licensing and runtime fit are weaker than building native synth capability.',
    rightsVerified: false,
  },
  {
    id: 'dexed',
    name: 'Dexed',
    role: 'NATIVE_SYNTHESIS',
    standing: 'EXCLUDED',
    reason: 'Same as Surge XT: read it, do not embed it.',
    rightsVerified: false,
  },
] as const;

export const sourceById = (id: string): SourceDecision | null =>
  SOURCE_POLICY.find((s) => s.id === id) || null;

// --- the factory, and how narrow it is ---------------------------------

export type InstrumentFamily =
  | 'DRUM_KIT'
  | 'BASS'
  | 'KEYS'
  | 'GUITAR'
  | 'STRINGS'
  | 'WINDS'
  | 'TUNED_PERCUSSION'
  | 'GM_FALLBACK';

/**
 * How many instruments the factory ships per family.
 *
 * Small on purpose. A factory set is a curated opinion, and a creator who
 * opens the keys family to eleven pianos has been given a research task
 * rather than an instrument. Everything past the slot count lives in the
 * catalogue as a candidate, not in the product.
 */
export const FACTORY_SLOTS: Readonly<Record<InstrumentFamily, number>> = {
  DRUM_KIT: 2,
  BASS: 2,
  KEYS: 3,
  GUITAR: 2,
  STRINGS: 2,
  WINDS: 2,
  TUNED_PERCUSSION: 1,
  GM_FALLBACK: 1,
};

export type InstrumentRuntime = 'SF2' | 'SFZ' | 'NATIVE';

export interface CatalogEntry {
  id: string;
  name: string;
  /** Which policy entry this came from. Must resolve, or it cannot be admitted. */
  sourceId: string;
  family: InstrumentFamily;
  runtime: InstrumentRuntime;
  /** What it is, in a creator's words. */
  character: string;
  /**
   * Whether the files are present in this repository. Nothing is downloaded
   * or bundled by writing an entry here -- the catalogue is the funnel, and
   * bundling is a separate, deliberate act.
   */
  present: boolean;
  /**
   * What this particular asset's licence permits, with a checksum tying the
   * record to the bytes it was read against.
   *
   * Separate from the source's `rightsVerified` on purpose, and both are
   * required. A library can be permissively licensed as a whole while an
   * individual file inside it is not -- per-asset licences are exactly why
   * OpenAIR and Freesound were ruled out as factory sources -- so clearing
   * the library does not clear the instrument.
   */
  admission?: ResourceAdmissionRecord;
}

/**
 * The curated catalogue.
 *
 * Empty of admitted instruments on purpose: nothing has been downloaded,
 * licence-read or bundled yet, and an entry claiming otherwise would be the
 * same fiction as the vault this replaces. Candidates are added here as they
 * are evaluated, and `factoryAdmission` decides whether any of them may ship.
 */
export const INSTRUMENT_CATALOG: CatalogEntry[] = [];

export type AdmissionRefusal =
  | 'UNKNOWN_SOURCE'
  | 'SOURCE_EXCLUDED'
  | 'SOURCE_NOT_A_LIBRARY'
  | 'RIGHTS_UNVERIFIED'
  | 'FALLBACK_OUTSIDE_GM'
  | 'FILES_ABSENT'
  | 'NO_ADMISSION_RECORD'
  | 'REDISTRIBUTION_NOT_PERMITTED'
  | 'NO_SLOT_LEFT';

export interface Admission {
  admitted: boolean;
  refusal?: AdmissionRefusal;
  /** Safe to show, and specific enough to act on. */
  detail?: string;
}

/**
 * Whether one catalogue entry may occupy a factory slot.
 *
 * `taken` is how many slots in that family are already filled, so the caller
 * decides what "already shipping" means rather than this file assuming a
 * global registry it does not own. `lookup` exists so the rules past the
 * rights gate can be exercised without anyone faking a licence reading in the
 * policy itself -- the shipped policy stays the shipped policy.
 */
export function factoryAdmission(
  entry: CatalogEntry,
  taken = 0,
  lookup: (id: string) => SourceDecision | null = sourceById
): Admission {
  const source = lookup(entry.sourceId);
  if (!source) {
    return {
      admitted: false,
      refusal: 'UNKNOWN_SOURCE',
      detail: `"${entry.sourceId}" is not in the sourcing policy. Nothing enters the factory from outside the funnel.`,
    };
  }
  if (source.standing === 'EXCLUDED') {
    return {
      admitted: false,
      refusal: 'SOURCE_EXCLUDED',
      detail: `${source.name} is ruled out: ${source.reason}`,
    };
  }
  if (source.standing !== 'FACTORY_CANDIDATE' && source.standing !== 'FALLBACK_ONLY') {
    return {
      admitted: false,
      refusal: 'SOURCE_NOT_A_LIBRARY',
      detail: `${source.name} is a ${source.role.toLowerCase().replace(/_/g, ' ')}, not a source of factory instruments.`,
    };
  }
  if (source.standing === 'FALLBACK_ONLY' && entry.family !== 'GM_FALLBACK') {
    return {
      admitted: false,
      refusal: 'FALLBACK_OUTSIDE_GM',
      detail: `${source.name} fills General MIDI gaps only. It cannot take the ${entry.family.toLowerCase().replace(/_/g, ' ')} slot from a flagship instrument.`,
    };
  }
  if (!source.rightsVerified) {
    return {
      admitted: false,
      refusal: 'RIGHTS_UNVERIFIED',
      detail:
        `Nobody has read ${source.name}'s licence at the source yet. ` +
        (source.rightsNote || 'That has to happen before anything from it ships.'),
    };
  }
  if (!entry.present) {
    return {
      admitted: false,
      refusal: 'FILES_ABSENT',
      detail: `${entry.name} is a candidate on paper; its files are not in this project.`,
    };
  }
  const record = entry.admission;
  if (!record) {
    return {
      admitted: false,
      refusal: 'NO_ADMISSION_RECORD',
      detail: `${entry.name} has no admission record. Clearing ${source.name} as a library does not clear one file inside it.`,
    };
  }
  if (!record.redistributionAllowed || !record.commercialAllowed) {
    return {
      admitted: false,
      refusal: 'REDISTRIBUTION_NOT_PERMITTED',
      detail:
        `${record.license} on ${entry.name} permits ` +
        `${record.commercialAllowed ? 'commercial use' : 'no commercial use'} and ` +
        `${record.redistributionAllowed ? 'redistribution' : 'no redistribution'}. The factory ships sounds, so it needs both.`,
    };
  }

  const capacity = FACTORY_SLOTS[entry.family];
  if (taken >= capacity) {
    return {
      admitted: false,
      refusal: 'NO_SLOT_LEFT',
      detail: `The ${entry.family.toLowerCase().replace(/_/g, ' ')} family ships ${capacity}. Something has to come out before this goes in.`,
    };
  }
  return { admitted: true };
}

/** What the factory holds right now, family by family. Honest when that is nothing. */
export function factoryState(): {
  family: InstrumentFamily;
  capacity: number;
  admitted: CatalogEntry[];
  candidates: CatalogEntry[];
}[] {
  return (Object.keys(FACTORY_SLOTS) as InstrumentFamily[]).map((family) => {
    const inFamily = INSTRUMENT_CATALOG.filter((e) => e.family === family);
    const admitted: CatalogEntry[] = [];
    const candidates: CatalogEntry[] = [];
    for (const entry of inFamily) {
      if (factoryAdmission(entry, admitted.length).admitted) admitted.push(entry);
      else candidates.push(entry);
    }
    return { family, capacity: FACTORY_SLOTS[family], admitted, candidates };
  });
}
