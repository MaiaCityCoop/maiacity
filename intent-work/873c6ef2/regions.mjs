// node regions.mjs <source.js> [region-substring]: per region its top-level declared names, and its free names
// resolved to other regions' top-level declarations (what it needs) and which other regions use its names (what it gives)
import { readFileSync } from 'node:fs';
import * as acorn from 'acorn';
import * as escope from 'eslint-scope';
export function analyse(src) {
  const ast = acorn.parse(src, { ecmaVersion: 2024, sourceType: 'module', ranges: true, allowHashBang: true, allowReturnOutsideFunction: true });
  const sm = escope.analyze(ast, { ecmaVersion: 2022, sourceType: 'module' });
  const g0 = sm.globalScope; const g = g0.childScopes.find(c => c.type === 'module');
  // regions by offsets
  const regions = []; const re = /^\/\/#region (.*)$/gm; let m;
  while ((m = re.exec(src))) { const end = src.indexOf('//#endregion', m.index); regions.push({ name: m[1], start: m.index, end: end + '//#endregion'.length }); }
  const regionAt = (pos) => regions.find(r => pos >= r.start && pos < r.end)?.name ?? '(outside)';
  const decl = new Map(); // var name -> region
  for (const v of g.variables) for (const d of v.defs) decl.set(v.name, regionAt(d.name.range[0]));
  for (const r of regions) { r.declares = [...decl].filter(([, x]) => x === r.name).map(([n]) => n); r.needs = new Map(); r.givesTo = new Map(); }
  const reg = Object.fromEntries(regions.map(r => [r.name, r]));
  for (const s of sm.scopes) for (const ref of s.references) {
    const v = ref.resolved; if (!v || v.scope !== g) continue;
    const from = regionAt(ref.identifier.range[0]); const to = decl.get(v.name);
    if (from === to) continue;
    const R = reg[from]; if (R) { if (!R.needs.has(to)) R.needs.set(to, new Set()); R.needs.get(to).add(v.name); }
    const T = reg[to]; if (T) { if (!T.givesTo.has(from)) T.givesTo.set(from, new Set()); T.givesTo.get(from).add(v.name); }
    if (ref.isWrite() && from !== to && T) (T.written ??= new Set()).add(v.name + '@' + from);
  }
  // unresolved globals used by region
  for (const ref of g0.through) { const R = reg[regionAt(ref.identifier.range[0])]; if (R) (R.globals ??= new Set()).add(ref.identifier.name); }
  return regions;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const [f, only] = process.argv.slice(2);
  for (const r of analyse(readFileSync(f, 'utf8'))) {
    if (only && !r.name.includes(only)) continue;
    console.log(`## ${r.name} chars ${r.end - r.start}`);
    for (const [k, v] of r.needs) console.log(`  needs from ${k}: ${[...v].join(' ')}`);
    for (const [k, v] of r.givesTo) console.log(`  gives to ${k}: ${[...v].join(' ')}`);
    if (r.written) console.log('  WRITTEN from outside:', [...r.written].join(' '));
  }
}
