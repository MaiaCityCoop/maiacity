/**
 * A film on a phone, measured (intent baad55ba): a story of play's, composed as the Stories player composes it
 * (src/lib/stories/compose.ts), played by HyperFrames' player in play's sealed frame with its files handed in by the page
 * (story-parity-page.ts, the Stories player's way), on an iPhone's viewport with the CPU throttled and a mobile network.
 * It prints, per film:
 *   - first: seconds from the page's start until the film's first frame is drawn (the frame's runtime ready and the media
 *     the first second shows ready to draw), and the bytes and requests the page took before it;
 *   - seek: seconds from a seek to the middle of the film until that moment plays (its media drawn and the clock running);
 * and fails when one is over its bound (--first, --bytes, --seek; s, MB, s).
 *
 *   bun scripts/story-phone.ts <story UUID>[,<story UUID>…] [--net 4g|3g] [--cpu 4] [--first 8] [--bytes 3] [--seek 4]
 *
 * The story and its files are play's, read with PLAY_MCP_TOKEN (sent to play only), each file held to its hash and kept in
 * ~/.cache/story-phone so a second run reads none again. No WebGL: a film with a world or live shot is refused here.
 */
import { chromium, devices } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { compose, VENDOR } from '../src/lib/stories/compose';
import { hashBytes } from '../src/lib/content/game/hash.js';

const args = process.argv.slice(2);
const opt = (name: string) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : undefined;
};
const ids = (args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? '').split(',').filter(Boolean);
if (!ids.length) throw new Error('usage: bun scripts/story-phone.ts <story UUID>[,…] [--net 4g|3g] [--cpu 4] [--first s] [--bytes MB] [--seek s]');
const NETS = {
	// Chrome DevTools' presets: Fast 3G 1.44 Mbit/s down, 150 ms; "Fast 4G" 9 Mbit/s down, 60 ms (latency doubled as
	// DevTools does for its request latency)
	'3g': { latency: 150 * 3.75, downloadThroughput: (1.44 * 1e6) / 8 * 0.9, uploadThroughput: (0.675 * 1e6) / 8 * 0.9 },
	'4g': { latency: 60 * 2.75, downloadThroughput: (9 * 1e6) / 8 * 0.9, uploadThroughput: (1.5 * 1e6) / 8 * 0.9 }
} as const;
const net = NETS[(opt('--net') ?? '4g') as keyof typeof NETS];
if (!net) throw new Error('--net is 4g or 3g');
const cpu = Number(opt('--cpu') ?? 4);
const bound = { first: Number(opt('--first') ?? Infinity), bytes: Number(opt('--bytes') ?? Infinity) * 1e6, seek: Number(opt('--seek') ?? Infinity) };
const SITE = resolve(import.meta.dir, '..');
const PLAY = process.env.PLAY_URL ?? 'https://play.maia.city';
const token = process.env.PLAY_MCP_TOKEN;
if (!token) throw new Error('PLAY_MCP_TOKEN: the stories and their files are play\'s');
const cache = join(homedir(), '.cache/story-phone');
mkdirSync(cache, { recursive: true });

const vendor: Record<string, string> = {
	[VENDOR.runtime.hash]: join(SITE, 'node_modules/@hyperframes/core/dist/hyperframe.runtime.iife.js'),
	[VENDOR.gsap.hash]: join(SITE, 'node_modules/gsap/dist/gsap.min.js'),
	[VENDOR.font.hash]: join(SITE, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')
};
/** a file of play's by its hash, held to it, kept in the cache */
async function file(h: string): Promise<Uint8Array> {
	if (vendor[h]) return new Uint8Array(readFileSync(vendor[h]));
	const at = join(cache, h);
	if (existsSync(at)) return new Uint8Array(readFileSync(at));
	const r = await fetch(`${PLAY}/api/files/${h}`, { headers: { authorization: `Bearer ${token}` } });
	if (!r.ok) throw new Error(`play's file ${h.slice(0, 12)}…: HTTP ${r.status}`);
	const bytes = new Uint8Array(await r.arrayBuffer());
	if (hashBytes(bytes) !== h) throw new Error(`play's file ${h.slice(0, 12)}… does not hash to its name`);
	writeFileSync(at, bytes);
	return bytes;
}
/** a story at its head, its links' timelines with it, over play's MCP (get_story) */
async function story(id: string) {
	const r = await fetch(`${PLAY}/api/mcp`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_story', arguments: { story: id, links: true } } })
	});
	const text = await r.text();
	const json = JSON.parse(text.startsWith('{') ? text : text.split('\n').find((l) => l.startsWith('data: '))!.slice(6));
	if (json.result?.isError || !json.result) throw new Error(`get_story ${id}: ${text.slice(0, 300)}`);
	return JSON.parse(json.result.content[0].text);
}

const bundle = await Bun.build({ entrypoints: [join(import.meta.dir, 'story-parity-page.ts')], target: 'browser', minify: false });
if (!bundle.success) throw new Error(bundle.logs.join('\n'));
const page = await bundle.outputs[0].text();
const type = (h: string) => (h === VENDOR.font.hash ? 'font/woff2' : vendor[h] ? 'text/plain; charset=utf-8' : 'application/octet-stream');

const browser = await chromium.launch();
let failed = false;
try {
	for (const id of ids) {
		const s = await story(id);
		const links = s.links ?? {};
		const bodies = [s, ...Object.values(links).map((l: any) => l.body)].filter(Boolean);
		const shots = bodies.flatMap((b: any) => b.tracks.filter((t: any) => t.kind === 'shots').flatMap((t: any) => t.clips));
		if (shots.some((c: any) => c.world || c.live)) throw new Error(`${id}: a world or live shot needs WebGL, a Mac job`);
		const compositions: Record<string, string> = {};
		for (const c of shots) if (typeof c.composition === 'string') compositions[c.composition] = new TextDecoder().decode(await file(c.composition));
		const html = compose(s, links, compositions, {}, {});
		// every file the composition names, ready before the clock starts: what is measured is the network's emulation
		for (const h of new Set([...html.matchAll(/\/api\/files\/([0-9a-f]{64})/g)].map((m) => m[1]))) await file(h);
		const server = Bun.serve({
			port: 0,
			async fetch(req) {
				const u = new URL(req.url);
				if (u.pathname === '/') return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>html,body{margin:0;background:#000}hyperframes-player{display:block;width:100vw;aspect-ratio:${(s.format ?? '9:16').replace(':', '/')}}</style><body><script type="module" src="/page.js"></script>`, { headers: { 'content-type': 'text/html' } });
				if (u.pathname === '/page.js') return new Response(page, { headers: { 'content-type': 'text/javascript' } });
				if (u.pathname === '/composition.html') return new Response(html, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
				const h = u.pathname.match(/^\/api\/files\/([0-9a-f]{64})$/)?.[1];
				if (h) {
					const bytes = await file(h);
					const range = req.headers.get('range')?.match(/^bytes=(\d+)-(\d*)$/);
					const head = { 'content-type': type(h), 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=31536000, immutable' };
					if (range) {
						const from = Number(range[1]), to = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
						return new Response(bytes.subarray(from, to + 1), { status: 206, headers: { ...head, 'content-range': `bytes ${from}-${to}/${bytes.length}` } });
					}
					return new Response(bytes, { headers: head });
				}
				return new Response(null, { status: 404 });
			}
		});
		const ctx = await browser.newContext({ ...devices['iPhone 13'] });
		const tab = await ctx.newPage();
		const cdp = await ctx.newCDPSession(tab);
		await cdp.send('Network.enable');
		await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
		await cdp.send('Network.emulateNetworkConditions', { offline: false, ...net });
		await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
		let bytes = 0, requests = 0;
		cdp.on('Network.loadingFinished', (e: any) => ((bytes += e.encodedDataLength), requests++));
		tab.on('console', (m) => m.type() === 'error' && console.error('player:', m.text()));
		const t0 = Date.now();
		await tab.goto(`http://localhost:${server.port}/`);
		/** the film's frame, once there */
		const inner = async () => {
			for (;;) {
				const f = tab.frames().find((x) => x !== tab.mainFrame());
				if (f) return f;
				await tab.waitForTimeout(50);
			}
		};
		/** true once the frame's runtime is ready and every shot or sound live at second t can be drawn or heard there */
		const drawn = (t: number) =>
			inner().then((f) =>
				f.waitForFunction(
					(t) => {
						const w = window as any;
						if (w.__renderReady !== true) return false;
						// [from, to) in the film's seconds: a clip's start and length within each composition it sits in
						const span = (el: any) => {
							let from = 0, to = Infinity;
							for (let e = el; e; e = e.parentElement)
								if (e.dataset?.start != null) {
									const at = Number(e.dataset.start) || 0;
									(from += at), (to = Math.min(to + at, at + (Number(e.dataset.duration) || Infinity)));
								}
							return [from, to];
						};
						const live = [...document.querySelectorAll('video, img')].filter((e: any) => {
							const [from, to] = span(e);
							return from <= t && t < to;
						});
						return live.every((e: any) => (e.tagName === 'VIDEO' ? e.readyState >= 2 : e.complete && e.naturalWidth > 0));
					},
					t,
					{ timeout: 600_000, polling: 100 }
				)
			);
		await tab.waitForFunction(() => (window as any).ready === true, null, { timeout: 600_000, polling: 100 });
		await drawn(0);
		const first = (Date.now() - t0) / 1000;
		const before = { bytes, requests };
		// a seek to the middle: until that second's media is drawn and the film's clock runs on from it
		const mid = Math.round((s.duration ?? 0) / 2);
		const t1 = Date.now();
		await tab.evaluate((t) => ((window as any).player.seek(t), (window as any).player.play()), mid);
		await drawn(mid);
		await tab.waitForFunction((t) => (window as any).player.currentTime > t + 0.1, mid, { timeout: 600_000, polling: 100 });
		const seek = (Date.now() - t1) / 1000;
		const ok = first <= bound.first && before.bytes <= bound.bytes && seek <= bound.seek;
		console.log(`${id.slice(0, 8)} "${s.title.slice(0, 40)}" (${s.duration} s): first frame ${first.toFixed(1)} s after ${(before.bytes / 1e6).toFixed(2)} MB in ${before.requests} requests; seek to ${mid} s plays in ${seek.toFixed(1)} s${ok ? '' : '  OVER'}`);
		failed ||= !ok;
		await ctx.close();
		server.stop(true);
	}
} finally {
	await browser.close();
}
console.log(`(${opt('--net') ?? '4g'}, CPU ${cpu}×, iPhone 13; bounds: first ${bound.first} s, ${bound.bytes / 1e6} MB, seek ${bound.seek} s)`);
if (failed) process.exitCode = 1;
