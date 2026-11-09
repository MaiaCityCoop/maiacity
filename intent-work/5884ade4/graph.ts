// The repository's dependency graph, scripted for intent 5884ade4 (untangle-codebase): what imports what, rerun as the
// work goes. `bun intent-work/5884ade4/graph.ts [cycles|modules|unstable|orphans|edges|json]` from the repository's root.
// Files: every tracked .ts/.js/.mjs/.svelte outside node_modules, play/api/import (data), static/ (built bundles) and
// intent-work/. An edge is a relative import, export-from, dynamic import or require that resolves to such a file.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const SKIP = /(^|\/)(node_modules|static|intent-work)\/|^play\/api\/import\//;
const files = execSync('git ls-files', { encoding: 'utf8' })
	.split('\n')
	.filter((f) => /\.(ts|js|mjs|svelte)$/.test(f) && !SKIP.test(f) && !/\.d\.ts$/.test(f));
const known = new Set(files);
const SPEC = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bexport\s*\*\s*from\s*|new URL\(\s*)['"`]((?:\.{1,2}|\$lib)\/[^'"`]+)['"`]/g;
// $lib is the package's src/lib (play/site, website)
const lib = (from: string) => from.replace(/^((?:play\/site|website)\/).*$/, '$1src/lib');

function resolve(from: string, spec: string): string | null {
	const clean = spec.replace(/\?.*$/, '');
	const base = clean.startsWith('$lib/') ? normalize(join(lib(from), clean.slice(5))) : normalize(join(dirname(from), clean));
	const tries = [base, ...['.ts', '.js', '.mjs', '.svelte', '/index.ts', '/index.js'].map((e) => base + e)];
	if (/\.js$/.test(base)) tries.push(base.replace(/\.js$/, '.ts'));
	for (const t of tries) if (known.has(t)) return t;
	return null;
}

export const edges = new Map<string, Set<string>>();
for (const f of files) {
	const out = new Set<string>();
	const src = readFileSync(f, 'utf8');
	for (const m of src.matchAll(SPEC)) {
		const r = resolve(f, m[1]);
		if (r && r !== f) out.add(r);
	}
	edges.set(f, out);
}

// strongly connected components (Tarjan), file level
function sccs(nodes: string[], adj: (n: string) => Iterable<string>): string[][] {
	let i = 0;
	const idx = new Map<string, number>(), low = new Map<string, number>(), on = new Set<string>(), st: string[] = [];
	const out: string[][] = [];
	const visit = (v: string) => {
		idx.set(v, i); low.set(v, i); i++; st.push(v); on.add(v);
		for (const w of adj(v)) {
			if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
			else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
		}
		if (low.get(v) === idx.get(v)) {
			const c: string[] = [];
			let w: string;
			do { w = st.pop()!; on.delete(w); c.push(w); } while (w !== v);
			if (c.length > 1) out.push(c.sort());
		}
	};
	for (const n of nodes) if (!idx.has(n)) visit(n);
	return out;
}

// a module is a file's directory
const mod = (f: string) => dirname(f);
const modEdges = new Map<string, Map<string, number>>();
for (const [f, out] of edges) for (const t of out) {
	const a = mod(f), b = mod(t);
	if (a === b) continue;
	if (!modEdges.has(a)) modEdges.set(a, new Map());
	modEdges.get(a)!.set(b, (modEdges.get(a)!.get(b) ?? 0) + 1);
}
const mods = [...new Set(files.map(mod))];
const ce = (m: string) => modEdges.get(m)?.size ?? 0;
const ca = (m: string) => mods.filter((o) => modEdges.get(o)?.has(m)).length;
// Martin's instability I = Ce / (Ca + Ce): 0 leans on nothing (stable), 1 nothing leans on it (free to change)
const inst = (m: string) => (ce(m) + ca(m) === 0 ? 0 : ce(m) / (ce(m) + ca(m)));

const isTest = (f: string) => /\.test\.|\/test\/|\/tests\/|testkit|fixtures\//.test(f);
const isEntry = (f: string) =>
	/\/routes\/|(^|\/)(scripts|avenbox|deploy|\.github|\.claude)\/|\.config\.|^tools\/[^/]+\/[^/]+\.(ts|js|mjs)$|play\/api\/src\/index\.ts$|\/bin\//.test(f) || isTest(f);

const cmd = process.argv[2] ?? 'summary';
const fileCycles = sccs(files, (n) => edges.get(n)!);
const modCycles = sccs(mods, (n) => modEdges.get(n)?.keys() ?? []);
const unstable: string[] = [];
for (const [a, out] of modEdges) for (const [b, n] of out)
	if (!isTest(a) && inst(b) > inst(a) + 1e-9) unstable.push(`${a} (I=${inst(a).toFixed(2)}) → ${b} (I=${inst(b).toFixed(2)}) ×${n}`);
const importedBy = new Map<string, number>();
for (const out of edges.values()) for (const t of out) importedBy.set(t, (importedBy.get(t) ?? 0) + 1);
const orphans = files.filter((f) => !importedBy.has(f) && !isEntry(f));

if (cmd === 'cycles') {
	console.log(`file cycles: ${fileCycles.length}`);
	for (const c of fileCycles) console.log('  ' + c.join('  ↔  '));
	console.log(`module cycles: ${modCycles.length}`);
	for (const c of modCycles) console.log('  ' + c.join('  ↔  '));
} else if (cmd === 'unstable') {
	console.log(`imports of a less stable module: ${unstable.length}`);
	for (const u of unstable.sort()) console.log('  ' + u);
} else if (cmd === 'orphans') {
	console.log(`files nothing imports (not an entry, route or test): ${orphans.length}`);
	for (const o of orphans) console.log('  ' + o);
} else if (cmd === 'modules') {
	for (const m of mods.sort()) console.log(`${inst(m).toFixed(2)} Ca=${ca(m)} Ce=${ce(m)} ${m}  → ${[...(modEdges.get(m)?.keys() ?? [])].join(', ')}`);
} else if (cmd === 'edges') {
	for (const [f, out] of edges) for (const t of out) console.log(`${f} -> ${t}`);
} else if (cmd === 'json') {
	console.log(JSON.stringify({ files: files.length, fileCycles, modCycles, unstable, orphans }, null, 1));
} else {
	console.log(`files ${files.length}, edges ${[...edges.values()].reduce((s, o) => s + o.size, 0)}, file cycles ${fileCycles.length}, module cycles ${modCycles.length}, less-stable imports ${unstable.length}, orphans ${orphans.length}`);
}
