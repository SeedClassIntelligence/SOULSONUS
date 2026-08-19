/**
 * The vault search, after it stopped calling itself CLAP.
 *
 * It never was CLAP: no weights, no audio encoder, no embedding. It matches
 * terms against tags, names and categories, which is a fine thing to be. What
 * it must not do is present that as a similarity measure, or return unrelated
 * sounds ranked low when the honest answer is "nothing matched".
 */
import { SoundVaultSemanticMatcher, soundVaultSearch } from '../../src/lib/soundVaultSearch';

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
}
const search = (q: string, c?: any, k = 3) => SoundVaultSemanticMatcher.matchSoundByPrompt(q, c, k);
const why = (r: any) => r.matchedTerms.map((m: any) => `${m.term}/${m.on}`).join(' ');

console.log('=== SOUND VAULT SEARCH ===\n');

console.log('-- it finds what the tags actually say --');
{
  const kick = search('fat punchy sub kick', 'drums');
  check('a kick query returns the kick', kick[0]?.presetId === 'vault_kick_punch_01', `${kick[0]?.name} — ${why(kick[0])}`);

  const rhodes = search('warm vintage soul electric piano', 'keys');
  check('a keys query returns the Rhodes', rhodes[0]?.presetId === 'vault_keys_rhodes_01', `${rhodes[0]?.name} — ${why(rhodes[0])}`);

  const airy = search('airy breath vocal chop');
  check('an unfiltered query still ranks correctly', airy[0]?.presetId === 'vault_vocal_airy_01', `${airy[0]?.name} — ${why(airy[0])}`);
}

console.log('\n-- it says why, rather than how much --');
{
  const r = search('distorted analog 808 sub')[0];
  check('every result carries its matched terms', r.matchedTerms.length > 0, why(r));
  check(
    'each match names where it landed',
    r.matchedTerms.every((m: any) => ['category', 'name', 'tag'].includes(m.on)),
    r.matchedTerms.map((m: any) => m.on).join(', ')
  );
  check(
    'no similarity percentage is offered',
    !('similarityScore' in r) && !('matchedVectorDimensions' in r),
    'the 512-dim vectors were never used by the ranking, and are gone'
  );
  check('a term matched on a tag is really in the tags', r.matchedTerms.filter((m: any) => m.on === 'tag').every((m: any) => r.tags.includes(m.term)), r.tags.join(', '));
}

console.log('\n-- nothing matched means nothing returned --');
{
  const nothing = search('bagpipes theremin harpsichord');
  check('an unmatched query returns no results', nothing.length === 0, `${nothing.length} results — ranking unrelated sounds last would read as an answer`);

  const empty = search('');
  check('an empty query returns no results', empty.length === 0, `${empty.length} results`);
}

console.log('\n-- ranking is by where the terms landed --');
{
  // 'drums' hits the category on both drum entries; 'crisp' is a snare tag only.
  const drums = search('drums crisp tight', 'drums', 3);
  check(
    'the entry matching more, and better, ranks first',
    drums[0]?.presetId === 'vault_snare_crisp_01',
    drums.map((d) => `${d.name.split(' ')[0]}:${d.matchWeight}`).join(' > ')
  );
  check(
    'weights are ordered, not equal',
    drums.length > 1 ? drums[0].matchWeight > drums[1].matchWeight : true,
    drums.map((d) => d.matchWeight).join(' > ')
  );
}

console.log('\n-- the category filter is a filter --');
{
  const inKeys = search('sub kick punchy', 'keys');
  check('a drum query filtered to keys returns nothing', inKeys.length === 0, `${inKeys.length} results`);
  check('and the exported helper agrees', soundVaultSearch.search('sub kick punchy', 'keys').length === 0, 'same answer through soundVaultSearch.search');
}

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
