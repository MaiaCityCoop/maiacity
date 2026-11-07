/**
 * One engine, measured (intent e53393e2's c8, play/SPEC.md §12): a story compiled once (src/lib/stories/compose.ts) is
 * rendered by HyperFrames' pinned renderer (`hyperframes render`, the CLI at the player's own version) and played by
 * HyperFrames' player in play's sealed frame (the Stories player's way: the composition sealed, its files handed in by
 * the page); the two pictures are compared at each second asked for, by SSIM (ffmpeg's). It prints each and the lowest,
 * and fails when the lowest is under --min-ssim. Needs Chrome (or playwright's Chromium) and ffmpeg; --serve only serves
 * the harness, to look at it in a browser.
 *
 *   bun scripts/story-parity.ts src/lib/stories/fixtures/hex-village.json --at 1.0,3.6,7.2 --min-ssim 0.98 [--keep dir] [--serve] [--film render.mp4 | frames dir] [--lossless]
 *
 * A live shot (intent f270269e) is drawn by the frozen box engine (static/engines) and the live runtime
 * (scripts/live-runtime.ts), both by their hashes; its recipe and pieces, and any file the fixture doesn't give, are
 * play's: fetched from play's read-only routes with PLAY_MCP_TOKEN (sent to play only), each held to its hash. The
 * renderer's project has the code laid in (compose.ts `laid`), the player's frame has it handed in by the page.
 */
import { chromium } from 'playwright';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { codeOf, compose, filesOf, laid, VENDOR } from '../src/lib/stories/compose';
import { liveRuntime } from './live-runtime';
import { enginesOf } from '../src/lib/kernel/engines.js';
import { hashBytes } from '../src/lib/content/game/hash.js';

const args = process.argv.slice(2);
const opt = (name: string) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};
const fixture = args.find((a, i) => !a.startsWith('--') && !['--at', '--min-ssim', '--keep', '--film', '--port'].includes(args[i - 1]));
if (!fixture) throw new Error('usage: bun scripts/story-parity.ts <fixture.json> --at 1.0,3.6,7.2 --min-ssim 0.98');
const at = (opt('--at') ?? '1').split(',').map(Number);
const least = Number(opt('--min-ssim') ?? 0.98);
const SITE = resolve(import.meta.dir, '..');
const work = opt('--keep') ? resolve(opt('--keep')!) : mkdtempSync(join(tmpdir(), 'story-parity-'));
mkdirSync(work, { recursive: true });

const { story, links, compositions, assets, worlds, files: given = {} } = JSON.parse(readFileSync(fixture, 'utf8'));
const html = compose(story, links, compositions, assets, worlds);
const [W, H] = [Number(html.match(/data-width="(\d+)"/)![1]), Number(html.match(/data-height="(\d+)"/)![1])];
// the project the renderer reads: the composition, and every file it names where play serves it (/api/files/<hash>)
const project = join(work, 'project');
mkdirSync(join(project, 'api/files'), { recursive: true });
const vendor: Record<string, string> = {
	[VENDOR.runtime.hash]: join(SITE, 'node_modules/@hyperframes/core/dist/hyperframe.runtime.iife.js'),
	[VENDOR.gsap.hash]: join(SITE, 'node_modules/gsap/dist/gsap.min.js'),
	[VENDOR.font.hash]: join(SITE, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
};
for (const e of enginesOf('box')) vendor[e.blake3] = join(SITE, `static/engines/engine-v${e.v}.js`);
if (codeOf(html).length) {
	const live = join(work, 'live-runtime.js');
	writeFileSync(live, await liveRuntime());
	vendor[VENDOR.live.hash] = live;
}
/** a file of play's, from its read-only routes with the token, held to its hash */
async function fromPlay(h: string) {
	// STORY_FILES: a play to read it from (a local stand-in), else play's own with the token
	if (process.env.STORY_FILES) return new Uint8Array(await (await fetch(`${process.env.STORY_FILES}/api/files/${h}`)).arrayBuffer());
	const token = process.env.PLAY_MCP_TOKEN;
	if (!token) throw new Error(`the fixture does not give file ${h.slice(0, 12)}… (and no PLAY_MCP_TOKEN to read it from play)`);
	const res = await fetch(`${process.env.PLAY_URL ?? 'https://play.maia.city'}/api/files/${h}`, { headers: { authorization: `Bearer ${token}` } });
	if (!res.ok) throw new Error(`play's file ${h.slice(0, 12)}…: HTTP ${res.status}`);
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (hashBytes(bytes) !== h) throw new Error(`play's file ${h.slice(0, 12)}… does not hash to its name`);
	return bytes;
}
const code: Record<string, string> = {};
for (const h of [...filesOf(html), ...codeOf(html)]) {
	const to = join(project, 'api/files', h);
	const from = vendor[h] ?? (given[h] ? resolve(fixture, '..', given[h]) : null);
	if (from) copyFileSync(from, to);
	else writeFileSync(to, await fromPlay(h));
	const bytes = readFileSync(to);
	if (hashBytes(new Uint8Array(bytes)) !== h) throw new Error(`file ${h.slice(0, 12)}… does not hash to its name`);
	if (codeOf(html).includes(h)) code[h] = bytes.toString('utf8');
}
writeFileSync(join(project, 'index.html'), laid(html, code));
const type = (h: string) => (h === VENDOR.font.hash ? 'font/woff2' : vendor[h] || code[h] ? 'text/plain; charset=utf-8' : 'application/octet-stream');

// the harness: HyperFrames' player as the Stories player sets it up, the page answering the frame's asks for files
const bundle = await Bun.build({ entrypoints: [join(import.meta.dir, 'story-parity-page.ts')], target: 'browser', minify: false });
if (!bundle.success) throw new Error(bundle.logs.join('\n'));
const script = await bundle.outputs[0].text();
const server = Bun.serve({
	port: Number(opt('--port') ?? 0),
	fetch(req) {
		const u = new URL(req.url);
		if (u.pathname === '/') return new Response(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}hyperframes-player{display:block;width:${W}px;height:${H}px}</style><body><script type="module" src="/page.js"></script>`, { headers: { 'content-type': 'text/html' } });
		if (u.pathname === '/page.js') return new Response(script, { headers: { 'content-type': 'text/javascript' } });
		if (u.pathname === '/favicon.ico') return new Response(null, { status: 204 });
		if (u.pathname === '/composition.html') return new Response(html, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
		const h = u.pathname.match(/^\/api\/files\/([0-9a-f]{64})$/)?.[1];
		if (h) return new Response(Bun.file(join(project, 'api/files', h)), { headers: { 'content-type': type(h) } });
		return new Response('not here', { status: 404 });
	}
});
if (args.includes('--serve')) {
	console.log(`the harness: http://localhost:${server.port}/ (window.player.seek(t))`);
	await new Promise(() => {});
}

const run = (cmd: string[]) => {
	const p = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' });
	if (p.exitCode !== 0) throw new Error(`${cmd[0]} ${cmd[1]}: ${p.stderr.toString().slice(-2000)}`);
	return p.stdout.toString() + p.stderr.toString();
};
try {
	// HyperFrames' render of it, and a still from it at each second
	// (--film: a render of this same composition made before, kept with --keep: a live shot's takes long without a GPU)
	// --lossless: its frames as PNGs (HyperFrames' png-sequence), so what is measured is the engine, not the film's
	// codec: a finely detailed shot (a palm's thousands of leaflets) loses SSIM to H.264 alone (0.96 against itself)
	// --player-only: the player's pictures alone (a world shot's posters, intent 90de96fb), no render to measure against
	const only = args.includes('--player-only');
	const lossless = args.includes('--lossless');
	const film = opt('--film') ? resolve(opt('--film')!) : join(work, lossless ? 'frames' : 'render.mp4');
	if (!opt('--film') && !only) run(['bunx', 'hyperframes@0.9.20', 'render', project, '-o', film, '--quiet', '--workers', '1', ...(lossless ? ['--format', 'png-sequence'] : ['--quality', 'delivery']), '--no-wait', '--no-experimental-fast-capture']);
	const pngs = lossless ? [...new Bun.Glob('*.png').scanSync({ cwd: film })].sort() : [];
	for (const t of only ? [] : at)
		if (lossless) run(['ffmpeg', '-y', '-loglevel', 'error', '-i', join(film, pngs[Math.round(t * story.fps)]), '-frames:v', '1', join(work, `render-${t}.png`)]);
		else run(['ffmpeg', '-y', '-loglevel', 'error', '-i', film, '-vf', `select=eq(n\\,${Math.round(t * story.fps)})`, '-frames:v', '1', join(work, `render-${t}.png`)]);
	// the player's picture at each second
	// in Chrome (else the renderer's own headless shell), with the renderer's font and colour flags
	const flags = { args: ['--font-render-hinting=none', '--force-color-profile=srgb'] };
	const cache = join(homedir(), '.cache/puppeteer');
	const shell = existsSync(cache) ? [...new Bun.Glob('chrome-headless-shell/*/*/chrome-headless-shell').scanSync({ cwd: cache, absolute: true })].sort().pop() : undefined;
	const browser = await chromium.launch({ ...flags, channel: 'chrome' }).catch(() => chromium.launch({ ...flags, executablePath: shell }));
	const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
	page.on('console', (m) => m.type() === 'error' && console.error('player:', m.text()));
	await page.goto(`http://localhost:${server.port}/`);
	await page.waitForFunction(() => (window as any).ready === true, null, { timeout: 120_000 });
	// and the composition's own setup (a live shot's builds: HyperFrames' __hf.buildReady), in its frame
	// (found, or the run fails: a seek before it is ready is not taken, and would measure the poster)
	let inner = page.frames().find((f) => f !== page.mainFrame());
	for (let i = 0; !inner && i < 600; i++) await page.waitForTimeout(100), (inner = page.frames().find((f) => f !== page.mainFrame()));
	if (!inner) throw new Error("the player's frame never came");
	await inner.waitForFunction(() => (window as any).__renderReady === true, null, { timeout: 300_000, polling: 250 });
	for (const t of at) {
		await page.evaluate((s) => (window as any).at(s), t);
		// and drawn in its frame (its own process, its WebGL slow without a GPU): two of its frames after the seek
		await inner.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
		await page.screenshot({ path: join(work, `player-${t}.png`), clip: { x: 0, y: 0, width: W, height: H }, timeout: 300_000 });
	}
	await browser.close();
	if (only) {
		console.log(`the player's pictures: ${at.map((t) => join(work, `player-${t}.png`)).join(', ')}`);
		process.exit(0);
	}
	// how alike, by SSIM
	const scores = at.map((t) => {
		const out = run(['ffmpeg', '-loglevel', 'info', '-i', join(work, `render-${t}.png`), '-i', join(work, `player-${t}.png`), '-lavfi', 'ssim', '-f', 'null', '-']);
		const s = Number(out.match(/All:([0-9.]+)/)?.[1]);
		console.log(`${t.toFixed(2)} s: SSIM ${s.toFixed(4)}`);
		return s;
	});
	const lowest = Math.min(...scores);
	console.log(`lowest SSIM ${lowest.toFixed(4)} (at least ${least})${opt('--keep') ? `; the stills are in ${work}` : ''}`);
	if (!(lowest >= least)) process.exitCode = 1;
} finally {
	server.stop(true);
	if (!opt('--keep')) rmSync(work, { recursive: true, force: true });
}
