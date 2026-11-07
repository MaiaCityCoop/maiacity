/**
 * A story's world shots' posters (intent 90de96fb, a Mac job: WebGL on Metal, never in the cloud): the story as an
 * intent makes it, kept in src/lib/stories/fixtures/stories/, played in HyperFrames' player as the Stories player plays
 * it (scripts/story-parity.ts --player-only), its world shots drawn live by the live runtime from the world's files
 * kept in src/lib/stories/fixtures/worlds/<version>/ (scripts/world-shot.ts --fetch), each held to its hash. One still
 * a world shot at its first frame, at the composition's size (1920×1080 for 16:9): <out>/player-<at>.png.
 *
 *   bun scripts/world-posters.ts --story <story UUID> --intent <intent UUID> --out <dir>
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const story = opt('--story'), intent = opt('--intent'), out = resolve(opt('--out') ?? 'posters');
if (!story) throw new Error('usage: bun scripts/world-posters.ts --story <UUID> --intent <UUID> --out <dir>');
const KEPT = resolve(import.meta.dir, '../src/lib/stories/fixtures');
const LIB = resolve(import.meta.dir, '../src/lib') + '/';
Bun.plugin({ name: 'lib', setup: (b) => void b.onResolve({ filter: /^\$lib\// }, (a) => ({ path: Bun.resolveSync('./' + a.path.slice(5), LIB) })) });
const { piecesOf } = await import('../src/lib/content/assets/box/pieces.js');

const body = JSON.parse(readFileSync(join(KEPT, 'stories', `${story}${intent ? `.${intent}` : ''}.json`), 'utf8'));
const shots = body.tracks.filter((t: any) => t.kind === 'shots').flatMap((t: any) => t.clips);
const worldShots = shots.filter((c: any) => c.world);
const files: Record<string, string> = {};
const worlds: Record<string, unknown> = {};
for (const version of new Set<string>(worldShots.map((c: any) => c.world.version))) {
	const dir = join(KEPT, 'worlds', version);
	if (!existsSync(join(dir, 'manifest.json'))) throw new Error(`world version ${version.slice(0, 12)}… is not kept (bun scripts/world-shot.ts --fetch)`);
	const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
	const kept = readdirSync(join(dir, 'files'));
	for (const h of kept) files[h] = join(dir, 'files', h);
	const code = (h: string) => readFileSync(join(dir, 'files', h), 'utf8');
	const deep = (c: string, seen = new Set<string>()): string[] => {
		for (const h of piecesOf(c) as string[]) if (!seen.has(h)) seen.add(h), deep(code(h), seen);
		return [...seen];
	};
	const pieces = new Set([...(m.pieces ?? []), ...deep(code(m.recipe))]);
	const guests: Record<string, string[]> = {};
	for (const h of kept) if (h !== m.recipe && !pieces.has(h) && !Object.values(guests).some((p) => p.includes(h))) guests[h] = deep(code(h));
	for (const p of Object.values(guests).flat()) delete guests[p];
	worlds[version] = { asset: m.asset, version, recipe: m.recipe, pieces: [...pieces], engine: m.engine, guests };
}
// the first shot's still, where it has one, comes from play's files (story-parity reads it with PLAY_MCP_TOKEN)
mkdirSync(out, { recursive: true });
const fixture = join(out, 'fixture.json');
writeFileSync(fixture, JSON.stringify({ story: body, links: {}, compositions: {}, assets: {}, worlds, files }));
const at = worldShots.map((c: any) => c.at);
console.log(`${worldShots.length} world shots: ${worldShots.map((c: any) => `${c.id} at ${c.at} s`).join(', ')}`);
if (args.includes('--dry')) process.exit(0);
const p = Bun.spawnSync(['bun', join(import.meta.dir, 'story-parity.ts'), fixture, '--at', at.join(','), '--player-only', '--keep', out], { stdout: 'inherit', stderr: 'inherit' });
if (p.exitCode !== 0) process.exit(p.exitCode ?? 1);
for (const c of worldShots) console.log(`${c.id}: ${join(out, `player-${c.at}.png`)}`);
