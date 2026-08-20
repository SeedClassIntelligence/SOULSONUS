/**
 * Ranking the sound vault against a typed query.
 *
 * This is not CLAP, and was never CLAP. The file was called
 * `clapEmbeddingMatcher.ts` while its own header disclaimed the name: real
 * LAION CLAP is a neural audio-text model with ~600 MB of weights, and none of
 * it is here. It is term matching over the tags, name and category each entry
 * already carries, which is a perfectly good thing to be -- it just should not
 * borrow the name of something it is not.
 *
 * Two things went with the rename. `textToFeatureVector` hashed *characters*
 * into 512 bins and `cosineSimilarity` compared the results; neither was ever
 * called by the ranking, so the vectors were dead weight and
 * `matchedVectorDimensions: 512` reported the width of an embedding that took
 * no part in anything. And the result was labelled `similarityScore`, a number
 * that reads as a neural measure -- it is now the matched terms themselves,
 * which is both honest and more use: "matched on punchy, sub, analog" tells a
 * creator why a sound came up, and 0.83 does not.
 */

export interface SoundVaultMatchResult {
  presetId: string;
  name: string;
  category: string;
  tags: string[];
  sampleUrl: string;
  origin: SampleOrigin;
  /** The query terms this entry actually matched, and where each one landed. */
  matchedTerms: { term: string; on: 'category' | 'name' | 'tag' }[];
  /** Sum of the weights of those matches. A ranking key, not a percentage. */
  matchWeight: number;
}

/**
 * Where a sample came from, said plainly.
 *
 * These six entries used to be stamped `R01_ADMITTED` / `R02_ADMITTED` /
 * `R03_ADMITTED` -- admission statuses from a governed-vault model whose
 * admission records were never written. The files behind them are 1-2 second
 * single-pitch tones this project generated (46.9 Hz for the "tube saturated
 * 808", 257.8 Hz for the "warm vintage Rhodes"), and four of the six are
 * byte-identical to files sitting in `public/audio/stems/` under entirely
 * different names -- the same bytes cannot be both a curated Rhodes and a
 * separated `other.wav`.
 *
 * Nothing is wrong with shipping generated tones to exercise a search. What
 * was wrong was dressing them as licensed library content. A real instrument
 * arrives through the curated catalogue in `soundSourcing.ts`, which requires
 * an admission record before anything can ship.
 */
export type SampleOrigin = 'GENERATED_PLACEHOLDER' | 'ADMITTED_LIBRARY';

export interface VaultAcousticEntry {
  id: string;
  name: string;
  category: 'drums' | 'bass' | 'synths' | 'keys' | 'vocals';
  tags: string[];
  sampleUrl: string;
  origin: SampleOrigin;
}

// The six generated tones that ship with the project, so the search has
// something real to rank. Not a library, and no longer described as one.
const VAULT_ACOUSTIC_INDEX: VaultAcousticEntry[] = [
  {
    id: 'vault_kick_punch_01',
    name: 'Heavy Punch Sub Kick',
    category: 'drums',
    tags: ['punchy', 'fat', 'heavy', 'analog', 'sub', 'low-end', 'thump', 'kick'],
    sampleUrl: '/samples/drums/kick_heavy_punch.wav',
    origin: 'GENERATED_PLACEHOLDER',
  },
  {
    id: 'vault_808_saturated_01',
    name: 'Distorted Tube 808 Bass',
    category: 'bass',
    tags: ['808', 'sub', 'distorted', 'warm', 'glide', 'analog', 'saturated', 'bass'],
    sampleUrl: '/samples/bass/808_tube_saturated.wav',
    origin: 'GENERATED_PLACEHOLDER',
  },
  {
    id: 'vault_snare_crisp_01',
    name: 'Tight Studio Snare & Clap',
    category: 'drums',
    tags: ['crisp', 'tight', 'acoustic', 'bright', 'crack', 'transient', 'snare', 'clap'],
    sampleUrl: '/samples/drums/snare_tight_studio.wav',
    origin: 'GENERATED_PLACEHOLDER',
  },
  {
    id: 'vault_keys_rhodes_01',
    name: 'Warm Vintage Electric Rhodes',
    category: 'keys',
    tags: ['warm', 'rhodes', 'electric', 'piano', 'vintage', 'dark', 'soul', 'keys'],
    sampleUrl: '/samples/keys/rhodes_warm_vintage.wav',
    origin: 'GENERATED_PLACEHOLDER',
  },
  {
    id: 'vault_synth_saw_lead_01',
    name: 'Hyper-Saw Polyphonic Lead',
    category: 'synths',
    tags: ['bright', 'saw', 'lead', 'polyphonic', 'edm', 'future-bass', 'detuned', 'synths'],
    sampleUrl: '/samples/synths/saw_lead_hyper.wav',
    origin: 'GENERATED_PLACEHOLDER',
  },
  {
    id: 'vault_vocal_airy_01',
    name: 'Airy Soul Breath Vocal Chop',
    category: 'vocals',
    tags: ['airy', 'soul', 'breath', 'vocal', 'lush', 'reverb', 'r&b', 'vocals'],
    sampleUrl: '/samples/vocals/vocal_chop_airy.wav',
    origin: 'GENERATED_PLACEHOLDER',
  },
];

/**
 * Which query terms an entry matches, and where.
 *
 * Weighted by where the match lands, because they are not equally
 * informative: a category match says the creator asked for that family of
 * sound at all, and a tag match says they asked for that character.
 */
const MATCH_WEIGHT = { category: 3, name: 2.5, tag: 2 } as const;

/**
 * The same ranking, over anything with searchable text.
 *
 * The vault browser in the workstation carries its own catalogue and did its
 * own `includes()` filter, so this module ranked a different six entries that
 * nothing on screen ever saw. One ranking, used by both.
 */
export function rankByTerms<T>(
  query: string,
  items: T[],
  fields: (item: T) => { category: string; name: string; tags: string[] }
): { item: T; matchedTerms: { term: string; on: 'category' | 'name' | 'tag' }[]; matchWeight: number }[] {
  const terms = [...new Set(query.toLowerCase().split(/[\s,._\-]+/).filter(Boolean))];
  if (!terms.length) return items.map((item) => ({ item, matchedTerms: [], matchWeight: 0 }));

  return items
    .map((item) => {
      const f = fields(item);
      const name = f.name.toLowerCase();
      const category = f.category.toLowerCase();
      const tags = f.tags.map((t) => t.toLowerCase());
      const matchedTerms: { term: string; on: 'category' | 'name' | 'tag' }[] = [];
      for (const term of terms) {
        if (category === term || category.includes(term)) matchedTerms.push({ term, on: 'category' });
        else if (name.includes(term)) matchedTerms.push({ term, on: 'name' });
        else if (tags.some((t) => t.includes(term))) matchedTerms.push({ term, on: 'tag' });
      }
      return {
        item,
        matchedTerms,
        matchWeight: matchedTerms.reduce((n, m) => n + MATCH_WEIGHT[m.on], 0),
      };
    })
    .filter((r) => r.matchWeight > 0)
    .sort((a, b) => b.matchWeight - a.matchWeight);
}

function matchTerms(query: string, entry: VaultAcousticEntry) {
  const terms = [...new Set(query.toLowerCase().split(/[\s,._\-]+/).filter(Boolean))];
  const name = entry.name.toLowerCase();
  const tags = entry.tags.map((t) => t.toLowerCase());
  const matched: { term: string; on: 'category' | 'name' | 'tag' }[] = [];

  for (const term of terms) {
    if (entry.category === term || entry.category.includes(term)) matched.push({ term, on: 'category' });
    else if (name.includes(term)) matched.push({ term, on: 'name' });
    else if (tags.includes(term)) matched.push({ term, on: 'tag' });
  }
  const weight = matched.reduce((n, m) => n + MATCH_WEIGHT[m.on], 0);
  return { matched, weight };
}

export class SoundVaultSemanticMatcher {
  /**
   * Matches a query prompt against sound vault entries using semantic token and keyword relevance.
   */
  public static matchSoundByPrompt(
    prompt: string,
    categoryFilter?: 'drums' | 'bass' | 'synths' | 'keys' | 'vocals',
    topK: number = 3
  ): SoundVaultMatchResult[] {
    const candidates = categoryFilter
      ? VAULT_ACOUSTIC_INDEX.filter((item) => item.category === categoryFilter)
      : VAULT_ACOUSTIC_INDEX;

    const scored = candidates.map((entry) => {
      const { matched, weight } = matchTerms(prompt, entry);
      return {
        presetId: entry.id,
        name: entry.name,
        category: entry.category,
        tags: entry.tags,
        sampleUrl: entry.sampleUrl,
        origin: entry.origin,
        matchedTerms: matched,
        matchWeight: weight,
      };
    });

    // An entry that matched nothing is not a weak match, it is not a match.
    // Returning it ranked last would put unrelated sounds under a query that
    // found none, which reads as a result.
    return scored
      .filter((r) => r.matchWeight > 0)
      .sort((a, b) => b.matchWeight - a.matchWeight)
      .slice(0, topK);
  }
}

export const soundVaultSearch = {
  search: (prompt: string, category?: VaultAcousticEntry['category'], topK?: number) =>
    SoundVaultSemanticMatcher.matchSoundByPrompt(prompt, category, topK),
};
