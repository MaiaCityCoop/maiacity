#!/usr/bin/env bun
/*
 * THE CENSUS HELD TO THE MAC (intent bba45d6e, c3): Sandbox 1's far view counted on the CPU at 6295a650's base and head,
 * with the inputs of its run 5 (./inputs/), against what the Mac drew then (./run5.json). Held within 1%: each frame's
 * triangles less its ghosts, the triangles in shapes, and each asset renderer's triangles less its ghosts (copies put
 * away yet still drawn at the origin, ./run5.json `ghosts`: how many there are is the page's history, not the view; the
 * Mac's head held 622 in its library where its base and the census hold 2,150, and its run caught the domes' stream
 * mid-way, dome 4's inside not yet in, where the census waits for it: intent 373050d1). The whole frame and each
 * renderer's whole count are shown beside them.
 * Exits 0 only if every count held is within 1%.
 *
 *   bun play/site/scripts/census/match.ts
 */
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HERE = import.meta.dir;
const ref = JSON.parse(readFileSync(join(HERE, 'run5.json'), 'utf8'));
const out = mkdtempSync(join(tmpdir(), 'census-match-'));
const WITHIN = 0.01;
let ok = true;
const rows: { site: string; what: string; mac: number; census: number; off: string; ok: string }[] = [];
/** a count held to the Mac's within 1%, or shown beside them only (`held` false) */
const row = (site: string, what: string, mac: number, census: number, held = true) => {
	const off = (census - mac) / mac;
	const pass = Math.abs(off) <= WITHIN;
	if (held) ok &&= pass;
	rows.push({ site, what, mac, census: Math.round(census), off: `${off >= 0 ? '+' : ''}${(off * 100).toFixed(2)}%`, ok: held ? (pass ? 'ok' : 'OFF') : 'shown' });
};

for (const [site, r] of Object.entries(ref.sites) as [string, any][]) {
	const json = join(out, `${site}.json`);
	const p = Bun.spawnSync(['bun', join(HERE, '..', 'census.ts'), '--view', ref.view, '--at', r.at, '--inputs', join(HERE, ref.inputs.dir), '--json', json], { stdout: 'inherit', stderr: 'inherit' });
	if (p.exitCode !== 0) throw new Error(`census at ${site} (${r.at}) failed`);
	const got = JSON.parse(readFileSync(json, 'utf8')).views[0];
	row(site, 'triangles a frame', r.tris, got.totals.tris, false);
	row(site, 'triangles in shapes', r.shapeTris, Object.values(got.shapeTris as Record<string, number>).reduce((a, b) => a + b, 0));
	// each renderer's own count, ghosts and all: shown, not held (how many ghosts there are is the page's history)
	for (const k of ['out', 'in', 'library']) row(site, `${k} triangles`, r.renderers[k].tris, got.renderers[k]?.tris ?? 0, false);
	const ghosts = Object.fromEntries(['out', 'in', 'library'].map((k) => [k, got.copies.filter((c: any) => c.renderer === k && c.ghost).length]));
	const ghostTris = Object.fromEntries(['out', 'in', 'library'].map((k) => [k, got.copies.filter((c: any) => c.renderer === k && c.ghost).reduce((a: number, c: any) => a + (c.tris ?? 0), 0)]));
	console.log(`${site}: ghosts (copies put away at the origin, still drawn): Mac ${JSON.stringify(r.ghosts)} costing ${JSON.stringify(r.ghostTris)}; census ${JSON.stringify(ghosts)} costing ${JSON.stringify(ghostTris)}`);
	// each renderer less its ghosts: what the view itself draws, whatever the page put away before
	const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
	row(site, 'a frame less ghosts', r.tris - sum(r.ghostTris), got.totals.tris - sum(ghostTris));
	for (const k of ['out', 'in', 'library']) if (r.renderers[k].tris - r.ghostTris[k] > 0) row(site, `${k} less ghosts`, r.renderers[k].tris - r.ghostTris[k], (got.renderers[k]?.tris ?? 0) - ghostTris[k]);
}
console.table(rows);
console.log(ok ? 'match: every count within 1% of the Mac' : 'match: some counts are more than 1% off the Mac');
process.exit(ok ? 0 : 1);
