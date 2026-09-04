/**
 * One answer to "how many syllables is this".
 *
 * The platform had two, and neither was one. `handleAddLyricLine` wrote
 * `words.map((w) => w + '-')` into `LyricLine.syllables`, so a typed line's
 * syllables were its words with a hyphen glued on -- "syllables" that counted
 * "electric" as one. The demo lines shipped with real splits typed by hand, so
 * the panel looked right and every line a creator actually wrote did not.
 *
 * That matters more now than it did: Step 7's cadence lock refuses a lyric
 * whose syllable count does not match what was performed, and a lock built on
 * a word count would be checking nothing.
 *
 * This is an estimator and says so. English spelling does not determine
 * syllable count -- "fire" is one or two depending on who is singing it -- so
 * the rules below are the standard vowel-group heuristic with the usual
 * corrections, and they are right about ordinary words and wrong about some.
 * Where a creator disagrees, the creator is right: the workstation shows the
 * count it read so it can be corrected rather than discovered later.
 */

/** Vowels, with y counted as one -- "rhythm" has none otherwise. */
const VOWELS = 'aeiouy';

const isVowel = (c: string) => VOWELS.includes(c);

/** Vowel pairs that are usually two sounds rather than one. */
const HIATUS = ['ia', 'io', 'eo', 'ua', 'uo', 'iu'];

/** Consonant pairs spelling one sound, which a syllable break cannot cross. */
const DIGRAPHS = ['gh', 'ch', 'sh', 'th', 'ph', 'ck', 'ng', 'wh', 'qu'];

/**
 * Splits one word into estimated syllables.
 *
 * Vowel groups mark the nuclei. A single consonant between two nuclei goes
 * with the following one (V-CV, as in "o-pen"); two or more split between
 * them (VC-CV, as in "win-ter"), which is the rule English orthography
 * mostly follows.
 */
export function splitWord(raw: string): string[] {
  const word = raw.toLowerCase().replace(/[^a-z']/g, '');
  if (!word) return raw ? [raw] : [];

  // Nuclei: the index ranges of each vowel group.
  const groups: [number, number][] = [];
  let i = 0;
  while (i < word.length) {
    if (isVowel(word[i])) {
      const start = i;
      while (i < word.length && isVowel(word[i])) i++;
      groups.push([start, i - 1]);
    } else i++;
  }

  // A trailing silent 'e' is not a nucleus -- "fade" is one syllable -- unless
  // the word ends in a consonant plus 'le', where the 'le' is ("ta-ble").
  const endsConsonantLe = /[^aeiou]le$/.test(word);
  const last = groups[groups.length - 1];
  if (
    groups.length > 1 &&
    !endsConsonantLe &&
    last[0] === last[1] &&
    word[last[0]] === 'e' &&
    last[1] === word.length - 1
  ) {
    groups.pop();
  }
  // "-ed" is silent except after t or d: "walked" is one, "wanted" is two.
  if (groups.length > 1 && /ed$/.test(word) && !/[td]ed$/.test(word)) {
    const l = groups[groups.length - 1];
    if (l[0] === word.length - 2) groups.pop();
  }
  // Two vowels written together are sometimes two nuclei -- "ne-on", "li-on",
  // "cru-el" -- and sometimes one, which is why the exception matters:
  // after t, c, s or x the same letters are a single sound ("na-tion",
  // "spe-cial", "anx-ious"). Split the group in that case.
  for (let g = groups.length - 1; g >= 0; g--) {
    const [start, end] = groups[g];
    for (let k = start; k < end; k++) {
      const pair = word.slice(k, k + 2);
      const before = k > 0 ? word[k - 1] : '';
      if (HIATUS.includes(pair) && !'tcsx'.includes(before)) {
        groups.splice(g + 1, 0, [k + 1, end]);
        groups[g] = [start, k];
        break;
      }
    }
  }

  // A syllabic consonant carries a beat with no vowel of its own: "rhy-thm",
  // "pris-m". Nothing else in the rules can see these.
  if (/(sm|thm)$/.test(word)) groups.push([word.length - 1, word.length - 1]);

  if (groups.length <= 1) return [raw];

  // Cut points between consecutive nuclei.
  const cuts: number[] = [];
  for (let g = 0; g < groups.length - 1; g++) {
    const between = groups[g + 1][0] - groups[g][1] - 1;
    if (between <= 0) cuts.push(groups[g + 1][0]); // adjacent nuclei: "di-et"
    else if (between === 1) cuts.push(groups[g + 1][0] - 1); // V-CV
    else {
      // Split the cluster near its middle rather than always after its first
      // consonant, so "heart-beat" does not come out as "hear-tbeat" -- and
      // never inside a digraph, which is one sound and cannot be halved.
      let at = groups[g][1] + 1 + Math.ceil(between / 2);
      if (DIGRAPHS.includes(word.slice(at - 1, at + 1))) at -= 1;
      cuts.push(at);
    }
  }

  // Cut the original spelling, so capitals and punctuation survive.
  const offset = raw.toLowerCase().indexOf(word[0]);
  const parts: string[] = [];
  let from = 0;
  for (const cut of cuts) {
    const at = cut + (offset < 0 ? 0 : offset);
    if (at > from && at < raw.length) {
      parts.push(raw.slice(from, at));
      from = at;
    }
  }
  parts.push(raw.slice(from));
  return parts.filter(Boolean);
}

/** How many syllables one word is estimated to carry. Never below one. */
export const countWord = (word: string): number => Math.max(1, splitWord(word).length);

export interface SyllableUnit {
  /** The syllable's own spelling. */
  text: string;
  /** The whole word it belongs to. */
  word: string;
  /** True for the first syllable of its word -- where a beat lands cleanly. */
  wordInitial: boolean;
  /** Index of the word within the line. */
  wordIndex: number;
}

/** Splits a line into syllables, keeping which word each one came from. */
export function syllabify(text: string): SyllableUnit[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: SyllableUnit[] = [];
  words.forEach((word, wordIndex) => {
    splitWord(word).forEach((text, i) => {
      out.push({ text, word, wordInitial: i === 0, wordIndex });
    });
  });
  return out;
}

/** How many syllables a whole line is estimated to carry. */
export const countLine = (text: string): number => syllabify(text).length;
