// How long a person takes to build in play's asset box, on the CPU (intent 67d5e185): the frozen box engine
// (play/site/static/engines/engine-v5.js, held to its hash in engines.json) run as a Worker in headless Chromium, the
// recipe and its pieces handed in as the page hands them (box/pieces.js withPieces). Wall time from the build asked to
// its answer, the median of 3, with the engine's own split (start, build, bake, serialize).
//
//   node tools/motion/boxtime.mjs stand-in|elder-woman|samuel [--under <s>]
//     stand-in, elder-woman: the mirror's source (tools/motion/assets) and pieces; samuel: his newest version on play,
//     its recipe and pieces from play's files by hash (PLAY_MCP_TOKEN)
//   node tools/motion/boxtime.mjs --clips stand-in [--at-most <ratio>]
//     the box's clip tables (box/clips.js motionOf) for walk and run, in Node, with the mirror's Person motion against
//     the one before it (baseline/motion-v2.js): the ratio of their medians of 3
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const HERE = new URL('.', import.meta.url).pathname;
import { SITE as PLAY_SITE } from '../site.cjs';
const SITE = `${PLAY_SITE}/`;
const B = await import('./box.mjs');

const args = process.argv.slice(2);
const flag = (k) => {
	const i = args.indexOf(k);
	return i < 0 ? undefined : Number(args[i + 1]);
};
const who = args.find((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--') && args[i - 1] !== '--clips'));
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const IDS = { 'stand-in': ['8ff16823-d2eb-506c-9705-0feba7cf989e', 'stand-in'], 'elder-woman': ['682d0d05-2196-5c4d-9fb5-5acd7ebfb17f', 'elder-woman'] };
const SAMUEL = 'b58c7b2c-6e59-4f14-980a-db93974326d0';
/** Person motion v2, the one this intent replaces: the baseline */
const BASE = '462564f4eb4928b4c8aa6021d12d250999460b02011809632025e25611cae72c';

if (args.includes('--clips')) {
	// ---- the clip tables for walk and run, now against before ----
	const { motionOf } = await import(pathToFileURL(`${SITE}src/lib/content/assets/box/clips.js`).href);
	const base = readFileSync(`${HERE}baseline/motion-v2.js`, 'utf8');
	if (B.hash(base) !== BASE) throw new Error('baseline/motion-v2.js is not Person motion v2');
	const src = readFileSync(`${HERE}assets/${who}.js`, 'utf8');
	const now = B.files['pieces/motion.js'];
	const castOf = (code, more) => B.run(code, who, more).recipe('x', 15, null).build();
	const time = (cast) => {
		const c = { rig: cast.rig, gears: cast.gears, clips: { walk: cast.clips.walk, run: cast.clips.run } };
		const t = performance.now();
		const m = motionOf(c, 1.7);
		if (!m?.clips?.walk || !m.clips.run) throw new Error('walk or run not written down');
		return (performance.now() - t) / 1000;
	};
	const after = castOf(src), before = castOf(src.split(now).join(BASE), { [BASE]: base });
	time(after), time(before); // warm both alike
	const a = [], b = [];
	for (let i = 0; i < 3; i++) a.push(time(after)), b.push(time(before));
	const ratio = median(a) / median(b);
	const most = flag('--at-most');
	console.log(`${who}: walk + run written down in ${median(a).toFixed(3)} s with Person motion ${now.slice(0, 8)}…, ${median(b).toFixed(3)} s with v2 ${BASE.slice(0, 8)}…: ${(ratio * 100).toFixed(0)}%${most ? ` (≤ ${most * 100}%)` : ''}`);
	process.exit(most === undefined || ratio <= most ? 0 : 1);
}

// ---- a whole build in the box's own engine ----
// (as play/site/src/lib/content/assets/box/engines.js writes a recipe file)
const RECIPE_HEAD = 'defineRecipe(function (require) {\n"use strict";\nvar module = { exports: {} }, exports = module.exports;\n';
const recipeTail = (id, v, variant) => `\nreturn module.exports.recipe(${JSON.stringify(id)}, ${v}, ${JSON.stringify(variant ?? null)});\n});\n`;
const engines = JSON.parse(readFileSync(`${SITE}src/lib/kernel/sandbox/engines.json`, 'utf8')).box;
const LATEST = engines.at(-1);
const engine = readFileSync(`${SITE}static/engines/engine-v${LATEST.v}.js`, 'utf8');
if (B.hash(engine) !== LATEST.blake3) throw new Error(`engine-v${LATEST.v}.js does not hash to its name`);
const PIECE = /^[0-9a-f]{64}$/;
const requires = (c) => [...new Set([...c.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]))].filter((n) => PIECE.test(n));

async function playFile(hash) {
	const res = await fetch(`https://play.maia.city/api/files/${hash}`, { headers: { authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` } });
	if (!res.ok) throw new Error(`play's file ${hash.slice(0, 12)}…: HTTP ${res.status}`);
	const text = await res.text();
	if (B.hash(text) !== hash) throw new Error(`play's file ${hash.slice(0, 12)}… does not hash to its name`);
	return text;
}
let code, fileAt;
if (who === 'samuel') {
	const res = await fetch(`https://play.maia.city/api/assets/${SAMUEL}`, { headers: { authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` } });
	if (!res.ok) throw new Error(`Samuel's asset: HTTP ${res.status}`);
	const a = await res.json();
	const v = (a.asset ?? a).versions[0];
	const recipe = v.recipe ?? v.variants?.find((x) => x.name === v.defaultVariant)?.recipe ?? v.variants?.[0]?.recipe;
	console.log(`samuel v${v.number}: recipe ${recipe.slice(0, 12)}…`);
	code = await playFile(recipe);
	fileAt = playFile;
} else if (IDS[who]) {
	const [id, variant] = IDS[who];
	code = RECIPE_HEAD + readFileSync(`${HERE}assets/${who}.js`, 'utf8') + recipeTail(id, 0, variant);
	const mirror = new Map(Object.entries(B.files).filter(([k]) => k.startsWith('pieces/')).map(([k, h]) => [h, readFileSync(`${HERE}${k}`, 'utf8')]));
	fileAt = async (h) => mirror.get(h) ?? playFile(h);
} else {
	console.error('who? stand-in, elder-woman or samuel');
	process.exit(2);
}
// its pieces, as the page resolves them (box/pieces.js piecesFor, withPieces)
const got = new Map();
const walk = async (c) => {
	for (const h of requires(c)) if (!got.has(h)) got.set(h, await fileAt(h)), await walk(got.get(h));
};
await walk(code);
// (as box/pieces.js withPieces wraps them)
const each = [...got].map(([hash, c]) => `${JSON.stringify(hash)}: function (require, module, exports) {\n"use strict";\n${c}\n}`).join(',\n');
const wrapped = `(function (define) {\nvar pieces = {\n${each}\n};\nvar own = Object.prototype.hasOwnProperty;\nself.defineRecipe = function (recipe) {\n\treturn define(function (require) {\n\t\tvar made = {};\n\t\tfunction need(name) {\n\t\t\tif (!own.call(pieces, name)) return require(name);\n\t\t\tif (!own.call(made, name)) {\n\t\t\t\tvar m = { exports: {} };\n\t\t\t\tmade[name] = m;\n\t\t\t\tpieces[name](need, m, m.exports);\n\t\t\t}\n\t\t\treturn made[name].exports;\n\t\t}\n\t\treturn recipe(need);\n\t});\n};\n})(self.defineRecipe);\n` + code;
const recipe = { hash: B.hash(code), code: wrapped };

// play/site's Playwright (its devDependency, installed by avenbox/up.sh), else one installed beside this file; its own
// Chromium where it is installed, else the machine's Chrome (GitHub's Ubuntu runners carry one)
const req = createRequire(`${SITE}package.json`);
const { chromium } = (() => {
	try {
		return req('playwright');
	} catch {
		return createRequire(import.meta.url)('playwright');
	}
})();
const launched = async () => {
	try {
		return await chromium.launch();
	} catch (e) {
		for (const o of [{ channel: 'chrome' }, { executablePath: '/opt/pw-browsers/chromium' }, { executablePath: '/usr/bin/chromium' }, { executablePath: '/usr/bin/chromium-browser' }])
			try {
				return await chromium.launch({ ...o, args: ['--headless=new', '--no-sandbox'] });
			} catch {}
		throw e;
	}
};
const browser = await launched();
const page = await browser.newPage();
await page.goto('about:blank');
const runs = [];
for (let i = 0; i < 3; i++) {
	const r = await page.evaluate(
		async ({ engine, recipe, v }) => {
			const w = new Worker(URL.createObjectURL(new Blob([engine], { type: 'text/javascript' })));
			let t0 = 0;
			const m = await new Promise((ok) => {
				w.onerror = (e) => ok({ ok: false, error: e.message });
				w.onmessage = (e) => {
					const [m] = e.data;
					if (m.op === 'ready') return (t0 = performance.now()), w.postMessage({ id: 1, op: 'build', recipe, engine: v });
					ok(m);
				};
			});
			w.terminate();
			return { s: (performance.now() - t0) / 1000, ok: m.ok, error: m.error, ms: m.ms };
		},
		{ engine, recipe, v: LATEST.v }
	);
	if (!r.ok) throw new Error(`the box could not build ${who}: ${r.error}`);
	runs.push(r);
	console.log(`  run ${i + 1}: ${r.s.toFixed(2)} s (start ${r.ms.start} ms, build ${r.ms.build} ms, bake ${r.ms.bake} ms, serialize ${r.ms.serialize} ms)`);
}
await browser.close();
const s = median(runs.map((r) => r.s));
const under = flag('--under');
console.log(`${who}: built in the box's engine v${LATEST.v} in ${s.toFixed(2)} s (median of 3)${under ? ` (< ${under} s)` : ''}`);
process.exit(under === undefined || s < under ? 0 : 1);
