/**
 * A world shot, built on the CPU (intent 90de96fb): a world version from play's files, built in Bun as a story's world
 * shot builds it in the Stories player (src/lib/stories/world-build.ts, the live runtime's own build), through the
 * frozen box engine (static/engines, held to its BLAKE3 hash) as workers. No DOM, no WebGL: what it checks is the
 * build, its time, its workers and the places it gives each frame, not a picture (that is a Mac job).
 *
 *   bun scripts/world-shot.ts --asset <world UUID> --version <its version's hash> [--fps 24] [--duration 6]
 *       [--within <s>] [--most-workers <n>] [--moving <t1>,<t2>]
 *   bun scripts/world-shot.ts --story <story UUID> [--intent <intent UUID>] --world-shots <n>
 *
 * --within: ready (the world, every guest build and every frame) within that many seconds; --most-workers: never more
 * engine workers alive at once; --moving t1,t2: built twice, the vehicles (guests of the group machines) stand in at
 * least 10 other places at story time t2 than at t1, and the two builds give the same places at both, to the byte.
 * --story: the story (as the intent's variant makes it, if one is named: doc_at; else its head: get_story; over play's MCP) has at least n world shots,
 * each its own camera path, each but the last going into the next with a cut.
 *
 * With PLAY_MCP_TOKEN (avenBOX's, sent to play only) it reads play: the asset, its files, the story. An intent's checks
 * run with no token at all (play/avenbox/intent.ts), so what they read is kept beside the code, written from play with
 * --fetch (src/lib/stories/fixtures/).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { WorkerLike } from '../src/lib/stories/world-build';

// the site's own `$lib/` imports, resolved here as SvelteKit's alias does, so it runs on a fresh checkout (no
// `svelte-kit sync` before it, as an intent's checks run it); the site's modules are imported only once it is in
const LIB = resolve(import.meta.dir, '../src/lib') + '/';
Bun.plugin({ name: 'lib', setup: (b) => void b.onResolve({ filter: /^\$lib\// }, (a) => ({ path: Bun.resolveSync('./' + a.path.slice(5), LIB) })) });
const { enginesOf } = await import('../src/lib/kernel/engines.js');
const { hashText } = await import('../src/lib/kernel/hash.js');
const { piecesOf } = await import('../src/lib/content/assets/box/pieces.js');
const { plantingsOf } = await import('../src/lib/content/assets/uses.js');
const { frameOf, framesOf } = await import('../src/lib/stories/live');
const { buildWorld, built, engineOf } = await import('../src/lib/stories/world-build');
const { boxWorker } = await import('./box-worker');

const args = process.argv.slice(2);
const opt = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const PLAY = process.env.PLAY_URL || 'https://play.maia.city';
const token = process.env.PLAY_MCP_TOKEN;
const fail = (why: string): never => {
	console.error(`world-shot: ${why}`);
	process.exit(1);
};
const fetching = args.includes('--fetch');
if (fetching && !token) fail('--fetch reads play with PLAY_MCP_TOKEN (avenBOX\'s token)');
const KEPT = resolve(import.meta.dir, '../src/lib/stories/fixtures');
const online = fetching;
const auth = { Authorization: `Bearer ${token}` };
let keptAt = '';

const files = new Map<string, string>();
async function file(hash: string) {
	if (files.has(hash)) return files.get(hash)!;
	if (!online) {
		const at = join(keptAt, 'files', hash);
		if (!existsSync(at)) fail(`file ${hash.slice(0, 12)}… is not kept in ${keptAt} (write it with --fetch)`);
		const text = readFileSync(at, 'utf8');
		if (hashText(text) !== hash) fail(`kept file ${hash.slice(0, 12)}… does not hash to its name`);
		files.set(hash, text);
		return text;
	}
	const r = await fetch(`${PLAY}/api/files/${hash}`, { headers: auth });
	if (!r.ok) fail(`file ${hash.slice(0, 12)}…: HTTP ${r.status}`);
	const text = await r.text();
	if (hashText(text) !== hash) fail(`file ${hash.slice(0, 12)}… does not hash to its name`);
	files.set(hash, text);
	return text;
}
async function deep(code: string, seen = new Set<string>()): Promise<string[]> {
	for (const h of piecesOf(code) as string[]) if (!seen.has(h)) seen.add(h), await deep(await file(h), seen);
	return [...seen];
}

let alive = 0, most = 0;
const workerOf = (v: number) => {
	try {
		return boxWorker(v, (n) => ((alive += n), (most = Math.max(most, alive))));
	} catch (e: any) {
		return fail(e.message);
	}
};

async function worldSpec(asset: string, version: string, fps: number, duration: number) {
	keptAt = join(KEPT, 'worlds', version);
	let v: any;
	if (online) {
		const r = await fetch(`${PLAY}/api/assets/${asset}`, { headers: auth });
		if (!r.ok) fail(`asset ${asset}: HTTP ${r.status}`);
		v = ((await r.json()).versions ?? []).find((x: any) => x.id === version);
	} else {
		if (!existsSync(join(keptAt, 'manifest.json'))) fail(`world version ${version.slice(0, 12)}… is not kept in ${keptAt} (write it with --fetch)`);
		v = JSON.parse(readFileSync(join(keptAt, 'manifest.json'), 'utf8'));
		if (v.asset !== asset || v.id !== version) fail(`${keptAt} keeps another world`);
	}
	if (!v?.recipe) fail(`asset ${asset} has no version ${version.slice(0, 12)}… with a recipe`);
	const code = await file(v.recipe), pieces = await deep(code), engine = v.engine ?? 1;
	const all = await Promise.all(pieces.map(async (p) => ({ hash: p, code: await file(p) })));
	const { withPieces } = await import('../src/lib/content/assets/box/pieces.js');
	const once = engineOf({ hash: v.recipe, code: withPieces(code, all) }, engine, workerOf(engine));
	let obj;
	try {
		obj = built(await once.build(undefined), v.recipe).obj;
	} finally {
		once.end();
	}
	const guests: Record<string, string[]> = {};
	for (const g of [...new Set(plantingsOf(obj).map((u: { ref: string }) => u.ref.slice(0, 64)))] as string[]) {
		guests[g] = await deep(await file(g));
		for (const p of guests[g]) await file(p);
	}
	if (fetching) {
		mkdirSync(join(keptAt, 'files'), { recursive: true });
		writeFileSync(join(keptAt, 'manifest.json'), JSON.stringify({ asset, id: version, number: v.number, recipe: v.recipe, engine, pieces: v.pieces ?? [] }, null, '\t') + '\n');
		for (const [h, text] of files) writeFileSync(join(keptAt, 'files', h), text);
		console.log(`kept ${files.size} files of ${asset.slice(0, 8)} v${v.number} in ${keptAt}`);
	}
	return { engine: { v: engine, hash: enginesOf('box').find((x: { v: number }) => x.v === engine)!.blake3 }, recipe: v.recipe, pieces, guests, fps, frames: framesOf(duration, fps) };
}

const placesAt = (got: { places: Float32Array[] }, t: number, fps: number, frames: number) => got.places[Math.min(frameOf(t, fps, frames), got.places.length - 1)];

async function checkWorld() {
	const asset = opt('--asset')!, version = opt('--version');
	if (!version) fail('--asset needs --version (a version\'s hash)');
	const fps = Number(opt('--fps') ?? 24), duration = Number(opt('--duration') ?? 6);
	const spec = await worldSpec(asset, version!, fps, duration);
	const code = (h: string) => files.get(h) ?? fail(`file ${h.slice(0, 12)}… was not read`);
	console.log(`world ${asset.slice(0, 8)} v${version!.slice(0, 8)}: ${Object.keys(spec.guests).length} guest recipes, ${spec.frames} frames at ${fps} fps`);
	alive = 0, most = 0;
	let last = '';
	const t0 = performance.now();
	const got = await buildWorld(spec, {
		code,
		worker: workerOf(spec.engine.v),
		progress: (p) => {
			if (p.step !== last || p.done === p.of) console.log(`  ${((performance.now() - t0) / 1000).toFixed(1)} s  ${p.text}`);
			last = p.step;
		}
	}).catch((e) => fail(`the world shot could not be built: ${e?.message ?? e}`));
	const s = (performance.now() - t0) / 1000;
	console.log(`ready ${s.toFixed(1)} s (${got.copies.length} guests placed, ${got.places.length} frames)`);
	console.log(`workers ${most}`);
	let bad = false;
	const within = opt('--within');
	if (within && !(s <= Number(within))) (bad = true), console.error(`not ready within ${within} s`);
	const mostW = opt('--most-workers');
	if (mostW && !(most <= Number(mostW))) (bad = true), console.error(`${most} workers at once, more than ${mostW}`);
	const moving = opt('--moving');
	if (moving) {
		const [t1, t2] = moving.split(',').map(Number);
		const cars = got.groups.map((g, i) => (g === 'machines' ? i : -1)).filter((i) => i >= 0);
		const at = (x: typeof got, t: number) => placesAt(x, t, fps, spec.frames);
		const moved = cars.filter((i) => at(got, t1).subarray(i * 16, i * 16 + 16).some((v, k) => Math.abs(v - at(got, t2)[i * 16 + k]) > 1e-3)).length;
		console.log(`moving ${moved} of ${cars.length} vehicles between ${t1} s and ${t2} s`);
		if (moved < 10) (bad = true), console.error(`only ${moved} vehicles moved between ${t1} s and ${t2} s: at least 10 must`);
		const again = await buildWorld(spec, { code, worker: workerOf(spec.engine.v) });
		for (const t of [t1, t2]) {
			const same = Buffer.from(at(got, t).buffer).equals(Buffer.from(at(again, t).buffer));
			console.log(`frame-exact at ${t} s: ${same ? 'the same places in both builds' : 'DIFFERENT places'}`);
			if (!same) bad = true;
		}
	}
	process.exit(bad ? 1 : 0);
}

async function tool(name: string, a: Record<string, unknown>) {
	const r = await fetch(`${PLAY}/api/mcp`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: a } }) });
	const text = await r.text();
	const body = text.startsWith('{') ? JSON.parse(text) : JSON.parse(text.split('\n').find((l) => l.startsWith('data:'))!.slice(5));
	const out = body.result?.content?.[0]?.text;
	if (!r.ok || body.error || body.result?.isError) fail(`${name}: ${body.error?.message ?? out ?? r.status}`);
	return JSON.parse(out);
}

async function checkStory() {
	const story = opt('--story')!, intent = opt('--intent'), want = Number(opt('--world-shots') ?? 1);
	const at = join(KEPT, 'stories', `${story}${intent ? `.${intent}` : ''}.json`);
	let s: any;
	if (online) {
		s = intent ? (await tool('doc_at', { doc: story, intent })).json : await tool('get_story', { story });
		mkdirSync(join(KEPT, 'stories'), { recursive: true });
		writeFileSync(at, JSON.stringify(s, null, '\t') + '\n');
		console.log(`kept ${at}`);
	} else {
		if (!existsSync(at)) fail(`story ${story.slice(0, 8)} is not kept in ${at} (write it with --fetch)`);
		s = JSON.parse(readFileSync(at, 'utf8'));
	}
	const shots = (s.tracks ?? []).filter((t: any) => t.kind === 'shots').flatMap((t: any) => t.clips).sort((a: any, b: any) => a.at - b.at);
	const worlds = shots.filter((c: any) => c.world && typeof c.world.asset === 'string');
	console.log(`story ${story.slice(0, 8)}${intent ? ` (intent ${intent.slice(0, 8)})` : ''}: ${shots.length} shots, ${worlds.length} world shots`);
	let bad = worlds.length < want;
	if (bad) console.error(`${worlds.length} world shots, fewer than ${want}`);
	const paths = new Set(worlds.map((c: any) => JSON.stringify(c.world.camera)));
	if (paths.size !== worlds.length) (bad = true), console.error('two world shots share one camera path');
	worlds.forEach((c: any, i: number) => {
		console.log(`  ${c.id}  at ${c.at} s for ${c.duration} s  ${c.world.camera.length} camera keys  → ${c.transition ?? ''}`);
		if (i < worlds.length - 1 && !/^cut\b/.test(String(c.transition ?? ''))) (bad = true), console.error(`  ${c.id} goes into the next with "${c.transition}", not a cut`);
	});
	process.exit(bad ? 1 : 0);
}

if (opt('--asset')) await checkWorld();
else if (opt('--story')) await checkStory();
else fail('give --asset <UUID> --version <hash>, or --story <UUID>');
