/**
 * Can the sourcing funnel actually refuse anything?
 *
 * A policy that lists decisions and never blocks one is a document. The whole
 * point of putting this in code is that a sound cannot reach the factory
 * without passing it, so every rule below is exercised by an entry built to
 * break exactly that rule and no other.
 *
 * The rule worth the most is RIGHTS_UNVERIFIED. This project shipped a vault
 * where every row carried a COMMERCIAL APPROVED badge against admission
 * records that did not exist. Believing a library is permissive is not the
 * same as having read its licence, and the guard has to hold the difference.
 */
import {
  CatalogEntry,
  FACTORY_SLOTS,
  INSTRUMENT_CATALOG,
  SOURCE_POLICY,
  factoryAdmission,
  factoryState,
  sourceById,
} from '../../src/lib/soundSourcing';
import { ResourceAdmissionRecord } from '../../src/types/daw';

const record = (over: Partial<ResourceAdmissionRecord> = {}): ResourceAdmissionRecord => ({
  admissionRecordId: 'adm_test',
  resourceId: 'cand',
  creator: 'Someone',
  license: 'CC0-1.0',
  commercialAllowed: true,
  redistributionAllowed: true,
  attributionRequired: false,
  trainingPermission: true,
  marketplacePermission: true,
  sha256Checksum: 'f'.repeat(64),
  admissionStatus: 'APPROVED',
  admissionNotes: 'read at the source',
  ...over,
});

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(50)} ${detail}`);
}

const entry = (over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id: 'cand',
  name: 'A Candidate Instrument',
  sourceId: 'vcsl',
  family: 'STRINGS',
  runtime: 'SFZ',
  character: 'a candidate',
  present: true,
  admission: record(),
  ...over,
});

console.log('=== THE SOURCING FUNNEL ===\n');

// ---- the policy itself ----
console.log('-- the decision, as data --');
check(
  'every source is named once',
  new Set(SOURCE_POLICY.map((s) => s.id)).size === SOURCE_POLICY.length,
  `${SOURCE_POLICY.length} sources`
);
check(
  'nothing claims verified rights without saying why it is safe',
  SOURCE_POLICY.every((s) => !s.rightsVerified || !!s.rightsNote || s.id.startsWith('soulsonus')),
  SOURCE_POLICY.filter((s) => s.rightsVerified).map((s) => s.name).join(', ')
);
check(
  'the excluded stay excluded',
  ['pianobook', 'philharmonia', 'freesound', 'openair', 'pedalboard', 'rubberband', 'surge-xt', 'dexed'].every(
    (id) => sourceById(id)?.standing === 'EXCLUDED'
  ),
  '8 sources ruled out, each with a reason'
);
check(
  'every exclusion carries a reason a person can read',
  SOURCE_POLICY.filter((s) => s.standing === 'EXCLUDED').every((s) => s.reason.length > 20),
  'no bare NO'
);

// ---- the refusals ----
console.log('\n-- what the funnel refuses --');
const cases: [string, CatalogEntry, string][] = [
  [
    'a source that is not in the policy at all',
    entry({ sourceId: 'some-library-someone-found' }),
    'UNKNOWN_SOURCE',
  ],
  ['an excluded library', entry({ sourceId: 'pianobook' }), 'SOURCE_EXCLUDED'],
  ['a plugin ruled out as core', entry({ sourceId: 'surge-xt' }), 'SOURCE_EXCLUDED'],
  ['a runtime mistaken for a library', entry({ sourceId: 'spessasynth' }), 'SOURCE_NOT_A_LIBRARY'],
  ['the generative model as a sample source', entry({ sourceId: 'ace-step-xl-base' }), 'SOURCE_NOT_A_LIBRARY'],
  [
    'a fallback bank reaching for a flagship slot',
    entry({ sourceId: 'musescore-general', family: 'KEYS' }),
    'FALLBACK_OUTSIDE_GM',
  ],
  ['a candidate nobody has licence-checked', entry({ sourceId: 'karoryfer' }), 'RIGHTS_UNVERIFIED'],
];
for (const [label, e, expected] of cases) {
  const got = factoryAdmission(e);
  check(`refused: ${label}`, !got.admitted && got.refusal === expected, `${got.refusal} — ${got.detail}`);
}

// ---- what the rules past the rights gate do ----
//
// VCSL is genuinely licence-checked now, so these run against the shipped
// policy rather than a stand-in. The stand-in is kept for one check: that
// clearing one library in a lookup does not leak into the others.
console.log('\n-- past the rights gate --');

const absent = factoryAdmission(entry({ present: false }));
check(
  'refused: a candidate whose files are not here',
  !absent.admitted && absent.refusal === 'FILES_ABSENT',
  absent.detail || ''
);

const noRecord = factoryAdmission(entry({ admission: undefined }));
check(
  'refused: a cleared library does not clear one file inside it',
  !noRecord.admitted && noRecord.refusal === 'NO_ADMISSION_RECORD',
  noRecord.detail || ''
);

const nonCommercial = factoryAdmission(
  entry({ admission: record({ license: 'CC BY-NC 4.0', commercialAllowed: false }) })
);
check(
  'refused: a licence that does not permit shipping it',
  !nonCommercial.admitted && nonCommercial.refusal === 'REDISTRIBUTION_NOT_PERMITTED',
  nonCommercial.detail || ''
);

check('admitted: cleared, present, and a slot free', factoryAdmission(entry()).admitted === true, `strings 0/${FACTORY_SLOTS.STRINGS} before`);

const full = factoryAdmission(entry(), FACTORY_SLOTS.STRINGS);
check(
  'refused: the family is already full',
  !full.admitted && full.refusal === 'NO_SLOT_LEFT',
  full.detail || ''
);
check(
  'the factory is deliberately small',
  Object.values(FACTORY_SLOTS).reduce((a, b) => a + b, 0) <= 16,
  Object.entries(FACTORY_SLOTS).map(([f, n]) => `${f}:${n}`).join(' ')
);

const asIfRead = (id: string) =>
  id === 'karoryfer' ? { ...sourceById('karoryfer')!, rightsVerified: true } : sourceById(id);
check(
  'clearing one library in a lookup does not clear the others',
  factoryAdmission(entry({ sourceId: 'karoryfer' }), 0, asIfRead).refusal !== 'RIGHTS_UNVERIFIED' &&
    factoryAdmission(entry({ sourceId: 'karoryfer' })).refusal === 'RIGHTS_UNVERIFIED',
  'the shipped policy is untouched by the stand-in'
);

// ---- what the factory actually holds ----
console.log('\n-- what the factory holds today --');
const kit = INSTRUMENT_CATALOG.find((e) => e.id === 'soulsonus-factory-kit');
check('the first instrument came through the funnel', !!kit, kit ? `${kit.name} from ${kit.sourceId}` : 'nothing admitted');
check(
  'and it passes the same gate everything else must',
  !!kit && factoryAdmission(kit).admitted === true,
  kit ? `${kit.admission?.license} · sha ${kit.admission?.sha256Checksum.slice(0, 12)}` : ''
);

const state = factoryState();
const drums = state.find((f) => f.family === 'DRUM_KIT')!;
check('it occupies a drum kit slot', drums.admitted.length === 1, `DRUM_KIT ${drums.admitted.length}/${drums.capacity}`);
check(
  'and no other family claims anything it has not got',
  state.filter((f) => f.family !== 'DRUM_KIT').every((f) => f.admitted.length === 0),
  state.map((f) => `${f.family} ${f.admitted.length}/${f.capacity}`).join(', ')
);

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
