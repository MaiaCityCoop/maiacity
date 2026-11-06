#!/usr/bin/env bun
/*
 * THE FLYOVER CAMERA — films the game's world map (/game/map/, the City view or empty) from a shot list, for the
 * films' shots on play's Stories (each shot's `video` and `frame`, MCP add_story_video / add_story_frame). The map is
 * the game's own (../../src/routes/game/map: its map, its city, its scene, its bar), held still for the camera on its
 * film page (/game/map/film/, development only): every frame is put where the shot says and drawn once, so a shot
 * renders the same every time.
 *
 *   bun scripts/flyover/flyover.mjs scripts/flyover/outro.mjs [--stills] [--only a,b] [--out film/outro]
 *        [--url http://localhost:5173] [--samples 6] [--scale 2] [--png]          (node runs it as well)
 *
 *   <shot list>  a module exporting `film` ({ fps, size: [w, h], css, shutter }) and `shots(map)`: the shots, each
 *                { name, dur (s), move: (u 0…1) => { eye, at, fov } (./camera.mjs), ui?: the game's bar on,
 *                cityFrom?: s into the shot the City is switched on (before it the map is empty), look?: ['tilt'],
 *                focus?: where a tilt's sharp band lies (0 top … 1 foot), size?, note? }; `map` is the map's
 *                info (window.__mapFilm.info: its villages, river, lakes, peaks) with village(id) → its centre [x, z]
 *   --stills     the first, middle and last frame of every shot (one sample, no shutter): <out>/stills/, contact.jpg
 *   --only       just these shots
 *   --samples    sub-frames added up for each frame, spread over the shutter (180°: half a frame's time), the motion
 *                blur a camera has; 1 for none
 *   --scale      the picture drawn this many times larger and filtered down (2: a 2160 × 3840 drawing for a 1080 ×
 *                1920 film), so a thousand distant trees do not shimmer
 *
 * The map is the game's one (SEED in ../../src/routes/game/map/map.ts), as the map page shows it. The page is laid out
 * `film.css` CSS pixels across (760 by default: the bar's whole row fits, its totals in view) and drawn at the pixel
 * ratio that makes it the film's size, times --scale.
 *   --png        each frame read off as PNG instead of JPEG (95): slower, lossless
 *
 * On a Mac it draws on the GPU (Google Chrome, ANGLE on Metal: CHROME names another Chrome): fast, and the defaults are
 * --samples 6 --scale 2. Anywhere else it draws in software (SwiftShader), several seconds a frame: the defaults
 * are --samples 1 --scale 1, good for stills and drafts.
 *
 * Out, in --out: <shot>.mp4 (H.264, the film's size and fps, ≤ 40 MB as play takes them), <shot>.jpg (its still: the
 * middle frame, or the last of a shot with the bar), reel.mp4 (every shot in order, to watch them together) and
 * shots.json (each shot's name, length, note and files). Needs ffmpeg and Playwright (play/site's devDependencies;
 * on a Mac it drives the system's Chrome, so no Playwright browser is needed there).
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '../..');
const mac = process.platform === 'darwin';

function args(argv) {
	const o = { list: null, stills: false, only: null, out: null, url: null, samples: mac ? 6 : 1, scale: mac ? 2 : 1, png: false };
	for (let i = 0; i < argv.length; i++) {
		const [k, v] = [argv[i], argv[i + 1]];
		if (k === '--stills') o.stills = true;
		else if (k === '--png') o.png = true;
		else if (k === '--only') (o.only = v.split(',')), i++;
		else if (k === '--out') (o.out = v), i++;
		else if (k === '--url') (o.url = v), i++;
		else if (k === '--samples') (o.samples = Math.max(1, Number(v))), i++;
		else if (k === '--scale') (o.scale = Number(v)), i++;
		else if (!k.startsWith('--') && !o.list) o.list = k;
		else throw new Error(`what is ${k}? (see the top of scripts/flyover/flyover.mjs)`);
	}
	if (!o.list) throw new Error('give a shot list: bun scripts/flyover/flyover.mjs scripts/flyover/outro.mjs');
	o.out ??= `film/${o.list.split('/').pop().replace(/\.m?js$/, '')}`;
	return o;
}

async function playwright() {
	for (const from of [site, process.cwd()]) {
		try {
			return createRequire(resolve(from, 'x.js'))('playwright');
		} catch {}
	}
	throw new Error('Playwright is needed: bun install (in play/site)');
}

/** a dev server: the one given, or one started here, and how to stop it (as scripts/render.mjs) */
async function server(url) {
	if (url) return { url, stop: () => {} };
	const port = 5300 + Math.floor(Math.random() * 400);
	const dev = spawn('bun', ['run', 'dev', '--', '--port', String(port), '--strictPort'], { cwd: site, stdio: ['ignore', 'pipe', 'pipe'] });
	let log = '';
	dev.stdout.on('data', (d) => (log += d));
	dev.stderr.on('data', (d) => (log += d));
	const at = `http://localhost:${port}`;
	for (let i = 0; i < 240; i++) {
		await new Promise((r) => setTimeout(r, 500));
		try {
			if ((await fetch(`${at}/game/map/film/`)).ok) return { url: at, stop: () => dev.kill() };
		} catch {}
		if (dev.exitCode !== null) break;
	}
	dev.kill();
	throw new Error(`the dev server did not start:\n${log.slice(-2000)}`);
}

/** the browser: on a Mac, Chrome on Metal; elsewhere Playwright's Chromium in software */
async function browser(chromium) {
	if (mac) {
		const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
		const args = ['--use-gl=angle', '--use-angle=metal', '--ignore-gpu-blocklist', '--hide-scrollbars'];
		return chromium.launch({ headless: true, args, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
	}
	return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

/** an ffmpeg that takes the frames one by one on its input and writes a film */
function encoder({ out, fps, size, png, look, focus, dur }) {
	const [w, h] = size;
	const fit = `scale=${w}:${h}:flags=lanczos,format=yuv420p`;
	let graph = `[0:v]${fit}[v]`;
	if (look?.includes('tilt')) {
		// a tilt-shift: sharp in a band across the frame at `focus`, blurred more the farther above or below it
		const f = focus ?? 0.55, band = 0.12, ramp = 0.24, m = `255*clip((abs(Y/H-${f})-${band})/${ramp}\\,0\\,1)`;
		graph =
			`[0:v]${fit},split=2[a][b];[b]gblur=sigma=${(h / 240).toFixed(1)}[soft];` +
			`color=black:s=${w}x${h}:r=${fps}:d=${dur + 1},format=yuv420p,geq=lum='${m}':cb='${m}':cr='${m}'[mask];` +
			`[a][soft][mask]maskedmerge[v]`;
	}
	const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', png ? 'png' : 'mjpeg', '-i', '-',
		'-filter_complex', graph, '-map', '[v]', '-t', String(dur), '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
		'-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
	const done = new Promise((ok, no) => ff.on('exit', (c) => (c === 0 ? ok() : no(new Error(`ffmpeg exited ${c} for ${out}`)))));
	return {
		write: (buf) => new Promise((ok) => (ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok))),
		end: () => (ff.stdin.end(), done)
	};
}

const o = args(process.argv.slice(2));
const list = await import(pathToFileURL(resolve(process.cwd(), o.list)).href);
const film = { fps: 30, size: [1080, 1920], css: 760, shutter: 0.5, ...list.film };
// the page laid out film.css pixels across, drawn at the ratio that makes it the film's size (and --scale times that)
const ratio = film.size[0] / film.css, viewport = { width: film.css, height: Math.round(film.size[1] / ratio) };
mkdirSync(o.out, { recursive: true });
const { chromium } = await playwright();
const dev = await server(o.url);
const b = await browser(chromium);
try {
	const page = await b.newPage({ viewport, deviceScaleFactor: ratio * (o.stills ? 1 : o.scale) });
	page.on('pageerror', (e) => console.error(`  page: ${e.message}`));
	await page.goto(`${dev.url}/game/map/film/`);
	await page.waitForFunction(() => !!window.__mapFilm, null, { timeout: 300_000, polling: 500 });
	await page.evaluate(() => document.fonts.ready);
	const gpu = await page.evaluate(() => {
		const gl = document.createElement('canvas').getContext('webgl2'), x = gl?.getExtension('WEBGL_debug_renderer_info');
		return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : 'unknown';
	});
	console.log(`drawing on: ${gpu}${/swiftshader/i.test(gpu) ? ' (software: slow; on a Mac it draws on Metal)' : ''}`);
	const info = await page.evaluate(() => window.__mapFilm.info);
	const map = { ...info, village: (id) => info.plots.find((p) => p.id === id)?.c ?? (() => { throw new Error(`no village ${id} on this map`); })() };
	console.log(`map ${info.seed}: ${info.villages} villages, ${info.people.toLocaleString('en')} people, ${Math.round(info.area / 1e6)} km²`);
	const shots = list.shots(map).filter((s) => !o.only || o.only.includes(s.name));

	// the eye never under the ground (a hill in the way), checked along each shot before anything is drawn
	for (const s of shots) {
		const eyes = Array.from({ length: 25 }, (_, i) => s.move(i / 24).eye);
		const low = await page.evaluate((eyes) => eyes.map(([x, y, z]) => y - window.__mapFilm.height(x, z)).reduce((a, b) => Math.min(a, b)), eyes);
		if (low < 6) console.warn(`  ${s.name}: the eye comes within ${low.toFixed(1)} of the ground (a hill?)`);
	}

	const frame = (s, t, samples) =>
		page.evaluate(([poses, ui, city]) => window.__mapFilm.frame({ poses, ui, city }), [
			Array.from({ length: samples }, (_, k) => s.move(Math.min(1, (t + (samples > 1 ? (film.shutter * (k + 0.5)) / samples / film.fps : 0)) / s.dur))),
			!!s.ui,
			s.cityFrom == null || t >= s.cityFrom
		]);

	if (o.stills) {
		const dir = `${o.out}/stills`, rows = [];
		mkdirSync(dir, { recursive: true });
		for (const s of shots) {
			const n = Math.round(s.dur * film.fps), row = [];
			for (const [k, i] of [[0, 0], [50, Math.floor(n / 2)], [100, n - 1]]) {
				await frame(s, i / film.fps, 1);
				const path = `${dir}/${s.name}-${k}.png`;
				await page.screenshot({ path });
				row.push(path);
			}
			rows.push(row);
			console.log(`stills ${s.name}`);
		}
		const tile = 480, h = Math.round((tile * film.size[1]) / film.size[0]);
		execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...rows.flat().flatMap((f) => ['-i', f]), '-filter_complex',
			rows.flat().map((_, i) => `[${i}]scale=${tile}:${h}[s${i}]`).join(';') + ';' +
			rows.map((r, j) => r.map((_, i) => `[s${j * 3 + i}]`).join('') + `hstack=3[r${j}]`).join(';') + ';' +
			(rows.length > 1 ? rows.map((_, j) => `[r${j}]`).join('') + `vstack=${rows.length}` : '[r0]null'),
			`${o.out}/contact.jpg`]);
		console.log(`${o.out}/contact.jpg`);
	} else {
		const made = [];
		for (const s of shots) {
			const n = Math.round(s.dur * film.fps), file = `${o.out}/${s.name}.mp4`, t0 = Date.now();
			const enc = encoder({ out: file, fps: film.fps, size: film.size, png: o.png, look: s.look, focus: s.focus, dur: s.dur });
			for (let i = 0; i < n; i++) {
				await frame(s, i / film.fps, o.samples);
				await enc.write(await page.screenshot(o.png ? { type: 'png' } : { type: 'jpeg', quality: 95 }));
				if (i % 30 === 29) process.stdout.write(`\r${s.name}: ${i + 1}/${n} frames, ${((Date.now() - t0) / (i + 1) / 1000).toFixed(2)} s a frame   `);
			}
			await enc.end();
			const still = `${o.out}/${s.name}.jpg`, at = s.ui ? s.dur - 0.5 / film.fps : s.dur / 2;
			execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(at), '-i', file, '-frames:v', '1', '-q:v', '2', still]);
			const mb = statSync(file).size / 1e6;
			console.log(`\r${s.name}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${file} (${mb.toFixed(1)} MB${mb > 40 ? ', over play\'s 40 MB' : ''})`);
			made.push({ name: s.name, dur: s.dur, size: s.size, note: s.note, video: file, frame: still, look: s.look ?? [] });
		}
		writeFileSync(`${o.out}/list.txt`, made.map((m) => `file '${resolve(m.video)}'`).join('\n'));
		execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${o.out}/list.txt`, '-c', 'copy', '-movflags', '+faststart', `${o.out}/reel.mp4`]);
		writeFileSync(`${o.out}/shots.json`, JSON.stringify({ seed: info.seed, fps: film.fps, size: film.size, samples: o.samples, scale: o.scale, gpu, shots: made }, null, 2));
		console.log(`${o.out}/reel.mp4 · ${o.out}/shots.json`);
	}
} finally {
	await b.close();
	dev.stop();
}
