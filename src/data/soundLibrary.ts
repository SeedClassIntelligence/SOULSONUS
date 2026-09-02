import { SoundAsset, InstrumentType } from '../types/daw';

/**
 * Browsable voice presets.
 *
 * Every entry here declared `COMMERCIAL APPROVED (CC-BY 4.0)` or `(MIT)` and a
 * `Verified Dataset Registry Entry (SeedSigned)` provenance. `sampleUrl` is
 * optional on SoundAsset and not one of these eleven sets it, so those were
 * licence and chain-of-custody claims made over audio that has never been in
 * this repository. A false licence is a worse defect than a missing file:
 * a missing file fails loudly the first time somebody presses play, and a
 * false licence stays quiet until it is somebody's legal problem.
 *
 * They are what they are -- descriptors that select and shape a voice the
 * studio renders through Tone.js -- and they now say so. Real audio, when it
 * arrives, carries its own real licence on the entry that ships it.
 */

export const SOUND_CATALOG: SoundAsset[] = [
  // KICKS
  {
    id: 'snd_kick_808_fat',
    name: '808 Thump Fat Kick',
    category: 'kick',
    voiceDescriptors: ['fat', 'meaty', 'deep', 'sub', '808', 'heavy', 'warm'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },
  {
    id: 'snd_kick_punchy_clean',
    name: 'Punchy Analog Kick',
    category: 'kick',
    voiceDescriptors: ['punchy', 'clean', 'tight', 'acoustic', 'hard', 'bright'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },
  {
    id: 'snd_kick_dark_sub',
    name: 'Dark Sub Boom Kick',
    category: 'kick',
    voiceDescriptors: ['dark', 'sub', 'boom', 'heavy', 'dirty', 'distorted'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },

  // SNARES
  {
    id: 'snd_snare_crisp_clap',
    name: 'Crisp Studio Clap/Snare',
    category: 'snare',
    voiceDescriptors: ['crisp', 'bright', 'tight', 'clap', 'clean', 'sharp'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },
  {
    id: 'snd_snare_meaty_rim',
    name: 'Meaty Wood Rimshot',
    category: 'snare',
    voiceDescriptors: ['meaty', 'fat', 'woody', 'warm', 'rimshot'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },
  {
    id: 'snd_snare_trap_pop',
    name: 'Trap Pop Snare',
    category: 'snare',
    voiceDescriptors: ['pop', 'bright', 'snap', 'hard', 'dirty'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },

  // HI-HATS
  {
    id: 'snd_hat_lofi_dusty',
    name: 'Lo-Fi Dusty Closed Hat',
    category: 'hihat',
    voiceDescriptors: ['dusty', 'lo-fi', 'soft', 'warm', 'vintage', 'dark'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },
  {
    id: 'snd_hat_sizzle_open',
    name: 'Sizzle Open Cymbal',
    category: 'hihat',
    voiceDescriptors: ['sizzle', 'bright', 'clean', 'open', 'fast'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },

  // MELODY / SYNTH
  {
    id: 'snd_synth_warm_analog',
    name: 'Warm Analog Saw Lead',
    category: 'melody',
    voiceDescriptors: ['warm', 'analog', 'smooth', 'bright', 'lead'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },
  {
    id: 'snd_synth_sub_bass',
    name: 'Deep Glide Sub Bass',
    category: 'melody',
    voiceDescriptors: ['deep', 'glide', 'sub', 'dark', 'bass'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },
  {
    id: 'snd_synth_vocal_chop',
    name: 'Soul Vocal Synth Chop',
    category: 'melody',
    voiceDescriptors: ['vocal', 'soul', 'chop', 'airy', 'bright', 'clean'],
    license: 'MIT (Tone.js) -- rendered, not sampled',
    provenance: 'Voice preset over the studio engine. No third-party audio.',
  },
];

/**
 * Perform semantic descriptor search on sound catalog
 */
export function searchSoundCatalog(query: string, categoryFilter?: InstrumentType): SoundAsset[] {
  const normalizedQuery = query.toLowerCase().trim();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  let filtered = SOUND_CATALOG;
  if (categoryFilter) {
    filtered = filtered.filter((item) => item.category === categoryFilter);
  }

  if (tokens.length === 0) return filtered;

  return filtered.filter((asset) => {
    const textTarget = `${asset.name} ${asset.category} ${asset.voiceDescriptors.join(' ')}`.toLowerCase();
    return tokens.some((token) => textTarget.includes(token));
  });
}
