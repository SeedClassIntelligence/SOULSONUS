#!/usr/bin/env node
/**
 * SRT-1 Seed Conformance Audit
 *
 * The seed drifted because prose has no enforcement surface. A document that
 * nothing checks is a document that gets summarised, and a summary is how the
 * original understanding was lost in the first place.
 *
 * This compiles seed/SRT-1.md and seed/SRT-1-A.md into clauses that pass or
 * fail. Following sessionBand.ts: every grant has a check that can fail, and
 * the checks are arithmetic rather than judgement. Where a clause genuinely
 * cannot be measured, it is not silently assumed honoured -- it reports
 * UNVERIFIED until a dated attestation with evidence is signed for it.
 *
 *   node scripts/seed_audit.mjs            full report
 *   node scripts/seed_audit.mjs --summary  one line per section
 *   node scripts/seed_audit.mjs --gate     exit 1 on any VIOLATION or regression
 *   node scripts/seed_audit.mjs --json     machine-readable
 */

import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(ROOT, 'seed/clauses.json');
const ATTEST = join(ROOT, 'seed/attestations.json');
const WAIVERS = join(ROOT, 'seed/waivers.json');
const BASELINE = join(ROOT, 'seed/baseline.json');

const SOURCE_EXT = ['.ts', '.tsx', '.js', '.jsx'];

const argv = process.argv.slice(2);
const want = (f) => argv.includes(f);

/* ---------- file collection ---------- */

const fileCache = new Map();

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (SOURCE_EXT.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}

/** Resolve a scope entry (a directory or an exact file) to a list of files. */
function resolveScope(scope) {
  const files = [];
  for (const s of scope) {
    const p = join(ROOT, s);
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) files.push(...walk(p));
    else files.push(p);
  }
  return [...new Set(files)];
}

function readFile(p) {
  if (!fileCache.has(p)) {
    try { fileCache.set(p, readFileSync(p, 'utf8')); } catch { fileCache.set(p, ''); }
  }
  return fileCache.get(p);
}

/* ---------- check evaluation ---------- */

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

function runCheck(check, attestations) {
  if (check.kind === 'attest') {
    const a = attestations[check.clauseId];
    if (!a) return { pass: false, state: 'UNVERIFIED', detail: check.blocked ? 'blocked — awaiting source text' : 'no signed attestation' };
    return { pass: true, state: 'ATTESTED', detail: `signed ${a.date} — ${a.evidence}` };
  }

  const scope = check.scope || ['src'];
  const files = resolveScope(scope);
  let re;
  try { re = new RegExp(check.pattern, 'g'); }
  catch { return { pass: false, state: 'ERROR', detail: `bad pattern: ${check.pattern}` }; }

  const hits = [];
  let total = 0;
  for (const f of files) {
    const n = countMatches(readFile(f), re);
    if (n > 0) { hits.push(relative(ROOT, f)); total += n; }
  }

  if (check.kind === 'forbidden') {
    return hits.length === 0
      ? { pass: true, state: 'CLEAN', detail: 'not present' }
      : { pass: false, state: 'VIOLATION', detail: `found in ${hits.length} file(s): ${hits.slice(0, 3).join(', ')}` };
  }

  if (check.kind === 'wired') {
    const need = check.minFiles ?? 2;
    return hits.length >= need
      ? { pass: true, state: 'WIRED', detail: `${hits.length} files (need ${need})` }
      : { pass: false, state: hits.length === 0 ? 'ABSENT' : 'DECLARED_NOT_WIRED', detail: `${hits.length} file(s), need ${need}${hits.length ? ` — only ${hits.slice(0, 2).join(', ')}` : ''}` };
  }

  // symbol
  const need = check.min ?? 1;
  return total >= need
    ? { pass: true, state: 'PRESENT', detail: `${total} occurrence(s) in ${hits.length} file(s)` }
    : { pass: false, state: 'ABSENT', detail: `0 occurrences in ${files.length} scanned file(s)` };
}

/* ---------- clause evaluation ---------- */

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const attestations = existsSync(ATTEST) ? JSON.parse(readFileSync(ATTEST, 'utf8')) : {};
const waivers = existsSync(WAIVERS) ? JSON.parse(readFileSync(WAIVERS, 'utf8')) : {};

const results = registry.clauses.map((clause) => {
  const checks = clause.checks.map((c) => ({
    ...c,
    result: runCheck({ ...c, clauseId: clause.id }, attestations),
  }));

  const violated = checks.some((c) => c.result.state === 'VIOLATION');
  const passed = checks.filter((c) => c.result.pass).length;
  const unverified = checks.some((c) => c.result.state === 'UNVERIFIED');

  let status;
  if (violated) status = 'VIOLATION';
  else if (unverified && passed === 0) status = 'UNVERIFIED';
  else if (passed === checks.length) status = 'HONORED';
  else if (passed === 0) status = 'ABSENT';
  else status = 'PARTIAL';

  const waiver = waivers[clause.id];
  return { ...clause, checks, status, waiver };
});

/* ---------- reporting ---------- */

const ICON = { HONORED: '✓', PARTIAL: '◐', ABSENT: '✗', VIOLATION: '⚠', UNVERIFIED: '?' };
const ORDER = ['VIOLATION', 'ABSENT', 'PARTIAL', 'UNVERIFIED', 'HONORED'];

const tally = (rs) => {
  const t = { HONORED: 0, PARTIAL: 0, ABSENT: 0, VIOLATION: 0, UNVERIFIED: 0 };
  rs.forEach((r) => t[r.status]++);
  return t;
};

const sections = [...new Set(results.map((r) => r.section))];
const overall = tally(results);

if (want('--json')) {
  console.log(JSON.stringify({ overall, clauses: results.map(({ id, section, title, status, waiver }) => ({ id, section, title, status, waiver: !!waiver })) }, null, 2));
  process.exit(0);
}

const fidelity = ((overall.HONORED / results.length) * 100).toFixed(1);

console.log('');
console.log('  SRT-1 SEED CONFORMANCE — SoulSonus');
console.log('  ' + '─'.repeat(66));
console.log(`  ${results.length} clauses across ${sections.length} sections of constitutional text`);
console.log(`  ✓ ${overall.HONORED} honored   ◐ ${overall.PARTIAL} partial   ✗ ${overall.ABSENT} absent   ⚠ ${overall.VIOLATION} violation   ? ${overall.UNVERIFIED} unverified`);
console.log(`  SEED FIDELITY: ${fidelity}%`);
console.log('');

for (const s of sections) {
  const rs = results.filter((r) => r.section === s);
  const t = tally(rs);
  const label = s === 'A' ? 'AMENDMENT A' : `SECTION ${s}`;
  const bar = rs.map((r) => ICON[r.status]).join('');
  console.log(`  ${label.padEnd(13)} ${bar.padEnd(9)}  ${t.HONORED}/${rs.length} honored`);

  if (!want('--summary')) {
    const shown = rs.slice().sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
    for (const r of shown) {
      if (r.status === 'HONORED' && !want('--all')) continue;
      const w = r.waiver ? `  [WAIVED: ${r.waiver.reason}]` : '';
      console.log(`      ${ICON[r.status]} SRT-1.${r.id}  ${r.title}${w}`);
      const failing = r.checks.filter((c) => !c.result.pass);
      for (const c of failing.slice(0, 2)) {
        console.log(`          ${c.result.state}: ${c.result.detail}`);
      }
    }
    if (rs.every((r) => r.status === 'HONORED')) console.log('      (all honored)');
    console.log('');
  }
}

/* ---------- gate ---------- */

const violations = results.filter((r) => r.status === 'VIOLATION' && !r.waiver);
if (violations.length) {
  console.log('  ' + '─'.repeat(66));
  console.log('  VIOLATIONS — these contradict the seed rather than merely lag it:');
  for (const v of violations) {
    console.log(`    ⚠ SRT-1.${v.id}  ${v.title}`);
    const note = v.checks.find((c) => c.note)?.note;
    if (note) console.log(`        ${note}`);
  }
  console.log('');
}

if (want('--gate')) {
  if (!existsSync(BASELINE)) {
    writeFileSync(BASELINE, JSON.stringify(Object.fromEntries(results.map((r) => [r.id, r.status])), null, 2));
    console.log('  Baseline written. Future runs gate against regression from here.');
    process.exit(violations.length ? 1 : 0);
  }
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const rank = { VIOLATION: 0, ABSENT: 1, UNVERIFIED: 2, PARTIAL: 3, HONORED: 4 };
  const regressions = results.filter((r) => base[r.id] && rank[r.status] < rank[base[r.id]] && !r.waiver);
  if (regressions.length) {
    console.log('  REGRESSION — a clause moved backwards without a waiver:');
    regressions.forEach((r) => console.log(`    SRT-1.${r.id}  ${base[r.id]} → ${r.status}  ${r.title}`));
    console.log('');
    console.log('  Add a dated entry to seed/waivers.json naming the clause and the reason,');
    console.log('  or restore the clause. Drift must be signed for, not silent.');
    process.exit(1);
  }
  process.exit(violations.length ? 1 : 0);
}
