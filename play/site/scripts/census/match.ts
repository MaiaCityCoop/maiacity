#!/usr/bin/env bun
/*
 * THE CENSUS HELD TO THE MAC (intent bba45d6e, c3): Sandbox 1's far view counted on the CPU at 6295a650's base and head,
 * with the inputs of its run 5 (./run5/), against what the Mac drew then (./run5.json): each frame's triangles, the
 * triangles in shapes, and each asset renderer's triangles. Prints each with its deviation, and how many of the Mac's
 * copies were ghosts (put-away copies still drawn, ./run5.json `ghosts`) beside the census's; exits 0 only if every one
 * is within 1%.
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
const row = (site: string, what: string, mac: number, census: number) => {
	const off = (census - mac) / mac;
	const pass = Math.abs(off) <= WITHIN;
	ok &&= pass;
	rows.push({ site, what, mac, census: Math.round(census), off: `${off >= 0 ? '+' : ''}${(off * 100).toFixed(2)}%`, ok: pass ? 'ok' : 'OFF' });
};

for (const [site, r] of Object.entries(ref.sites) as [string, any][]) {
	const json = join(out, `${site}.json`);
	const p = Bun.spawnSync(['bun', join(HERE, '..', 'census.ts'), '--view', ref.view, '--at', r.at, '--inputs', join(HERE, ref.inputs.dir), '--json', json], { stdout: 'inherit', stderr: 'inherit' });
	if (p.exitCode !== 0) throw new Error(`census at ${site} (${r.at}) failed`);
	const got = JSON.parse(readFileSync(json, 'utf8')).views[0];
	row(site, 'triangles a frame', r.tris, got.totals.tris);
	row(site, 'triangles in shapes', r.shapeTris, Object.values(got.shapeTris as Record<string, number>).reduce((a, b) => a + b, 0));
	for (const k of ['out', 'in', 'library']) row(site, `${k} triangles`, r.renderers[k].tris, got.renderers[k]?.tris ?? 0);
	const ghosts = Object.fromEntries(['out', 'in', 'library'].map((k) => [k, got.copies.filter((c: any) => c.renderer === k && c.ghost).length]));
	console.log(`${site}: ghosts (copies put away at the origin, still drawn): Mac ${JSON.stringify(r.ghosts)}, census ${JSON.stringify(ghosts)}`);
}
console.table(rows);
console.log(ok ? 'match: every count within 1% of the Mac' : 'match: some counts are more than 1% off the Mac');
process.exit(ok ? 0 : 1);
