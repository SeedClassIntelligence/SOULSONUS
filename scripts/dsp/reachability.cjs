/**
 * What in src/ is actually reachable from the app the browser loads.
 *
 * Three times now a component reported as "not built" turned out to be built
 * and unreachable, and each time it was found by accident: BuildWorkspace
 * rendered by nothing, ContextualToolPanel imported by nothing, and an
 * intelligence dock that called the real reasoning provider while a scripted
 * drawer was the one on screen. Accident is not a method.
 *
 * This walks the import graph from the entry point the browser actually
 * requests and reports what never gets pulled in. It resolves relative
 * imports only — a package import is not our reachability problem.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const ENTRY = path.join(SRC, 'main.tsx');
const EXT = ['.ts', '.tsx', '.js', '.jsx'];

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.includes(path.extname(p))) out.push(p);
  }
  return out;
};

const resolve = (from, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const c of [base, ...EXT.map((e) => base + e), ...EXT.map((e) => path.join(base, 'index' + e))]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
};

// import ... from 'x'  ·  export ... from 'x'  ·  import('x')
const SPECS = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

const importsOf = (file) => {
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  let m;
  SPECS.lastIndex = 0;
  while ((m = SPECS.exec(src))) out.push(m[1] || m[2]);
  return out;
};

const reached = new Set();
const stack = [ENTRY];
while (stack.length) {
  const f = stack.pop();
  if (!f || reached.has(f)) continue;
  reached.add(f);
  for (const spec of importsOf(f)) {
    const r = resolve(f, spec);
    if (r) stack.push(r);
  }
}

const all = walk(SRC);
const orphans = all.filter((f) => !reached.has(f)).sort();

// Which orphans are imported by another orphan? Those are branches of one dead
// tree; the ones nothing imports at all are the roots worth deciding about.
const importedBy = new Map();
for (const f of all) {
  for (const spec of importsOf(f)) {
    const r = resolve(f, spec);
    if (r) (importedBy.get(r) || importedBy.set(r, []).get(r)).push(f);
  }
}

const rel = (f) => path.relative(ROOT, f);
const roots = orphans.filter((f) => !(importedBy.get(f) || []).length);
const branches = orphans.filter((f) => (importedBy.get(f) || []).length);

console.log(`=== REACHABILITY FROM ${rel(ENTRY)} ===\n`);
console.log(`${all.length} files under src/ · ${reached.size} reachable · ${orphans.length} not\n`);

console.log(`-- ${roots.length} dead roots: nothing in src imports these at all --`);
for (const f of roots) {
  const lines = fs.readFileSync(f, 'utf8').split('\n').length;
  const isComponent = /export (default )?(function|const) [A-Z]/.test(fs.readFileSync(f, 'utf8'));
  console.log(`  ${rel(f).padEnd(56)} ${String(lines).padStart(5)} lines${isComponent ? '  [component]' : ''}`);
}

console.log(`\n-- ${branches.length} dead branches: reached only from another orphan --`);
for (const f of branches) {
  console.log(`  ${rel(f).padEnd(56)} <- ${(importedBy.get(f) || []).map(rel).join(', ')}`);
}

const deadLines = orphans.reduce((n, f) => n + fs.readFileSync(f, 'utf8').split('\n').length, 0);
console.log(`\n${deadLines} lines of src/ are not reachable from the entry point.`);
