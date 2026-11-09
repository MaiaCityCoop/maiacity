/**
 * The Old City's world built in WebKit's sealed frame (intent 4f7a2178), on the CPU: no WebGL, only the frozen box
 * engine's build. In Safari the film failed "the build of 8439eb01 failed: Load failed": the frame's engine worker came
 * from a blob: URL revoked as soon as the worker was made, and WebKit then fails the importScripts(blob:) the engine runs
 * each recipe by. This makes the frame as the Stories player does (sandbox="allow-scripts", srcdoc, compose.ts's CSP),
 * starts the engine there by the runtime's own worker (src/lib/stories/world-build.ts `blobWorker`, bundled from the
 * source) and builds the world's recipe from the files kept beside the code. It passes when the build answers with a
 * card naming the recipe.
 *
 *   bun scripts/webkit-world.ts
 *
 * WebKit is installed (with its system libraries) when it is missing.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webkit, type Browser } from 'playwright';
import { CSP } from '../src/lib/stories/compose';
import { engineAt } from '../src/lib/kernel/engines.js';
import { hashBytes, hashText } from '../src/lib/kernel/hash.js';

const SITE = resolve(import.meta.dir, '..');
const V8 = '9bb90d4c3f21a900d01a6729ac61d6e103d9f0abeb45668cf711a497729c68a8';
const KEPT = resolve(SITE, `src/lib/stories/fixtures/worlds/${V8}`);
const manifest = JSON.parse(readFileSync(resolve(KEPT, 'manifest.json'), 'utf8'));
const fail = (why: string): never => (console.error(`webkit-world: ${why}`), process.exit(1));

const engine = engineAt('box', manifest.engine) as { v: number; blake3: string };
const engineCode = readFileSync(resolve(SITE, `static/engines/engine-v${engine.v}.js`));
if (hashBytes(engineCode) !== engine.blake3) fail(`engine ${engine.v} does not hash to its name`);
const recipe = readFileSync(resolve(KEPT, 'files', manifest.recipe), 'utf8');
if (hashText(recipe) !== manifest.recipe) fail('the kept recipe does not hash to its name');
if (manifest.pieces.length) fail('the kept world names pieces this check does not lay in');

// the runtime's worker and engine, bundled from the source as the live runtime bundles them
const entry = resolve(import.meta.dir, '.webkit-world-entry.ts');
await Bun.write(entry, `import { blobWorker, engineOf } from '../src/lib/stories/world-build';
addEventListener('message', async (e) => {
	if (e.source !== parent || e.data?.op !== 'build') return;
	const { engine, recipe } = e.data;
	const box = engineOf(recipe, engine.v, blobWorker(engine.hash, () => engine.code));
	try {
		const m = await box.build(undefined);
		parent.postMessage({ ok: true, recipe: m.card?.recipe, group: m.card?.group }, '*');
	} catch (x) {
		parent.postMessage({ ok: false, error: String(x?.message ?? x) }, '*');
	} finally {
		box.end();
	}
});
parent.postMessage({ op: 'up' }, '*');
`);
const out = await Bun.build({ entrypoints: [entry], target: 'browser', format: 'iife', define: { 'import.meta.env.DEV': 'false', 'import.meta.env': '{}' } });
await Bun.file(entry).delete();
if (!out.success) fail(`the bundle: ${out.logs.join('\n')}`);
const bundle = await out.outputs[0].text();

async function launch(): Promise<Browser> {
	try {
		return await webkit.launch();
	} catch (e: any) {
		console.log(`webkit is not ready (${String(e?.message ?? e).split('\n')[0]}): installing it`);
		const p = Bun.spawnSync(['bunx', 'playwright', 'install', '--with-deps', 'webkit'], { cwd: SITE, stdout: 'inherit', stderr: 'inherit' });
		if (p.exitCode !== 0) fail('could not install webkit');
		return webkit.launch();
	}
}

const browser = await launch();
try {
	const page = await browser.newPage();
	await page.goto('about:blank');
	const srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="${CSP}"><script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>`;
	const got: any = await page.evaluate(
		({ srcdoc, engine, recipe }) =>
			new Promise((ok) => {
				const frame = document.createElement('iframe');
				frame.setAttribute('sandbox', 'allow-scripts');
				frame.srcdoc = srcdoc;
				addEventListener('message', (e) => {
					if (e.source !== frame.contentWindow) return;
					if (e.data?.op === 'up') frame.contentWindow!.postMessage({ op: 'build', engine, recipe }, '*');
					else ok(e.data);
				});
				document.body.append(frame);
				setTimeout(() => ok({ ok: false, error: 'no answer within 60 s' }), 60_000);
			}),
		{ srcdoc, engine: { v: engine.v, hash: engine.blake3, code: new TextDecoder().decode(engineCode) }, recipe: { hash: manifest.recipe, code: recipe } }
	);
	console.log(`WebKit ${browser.version()}, sealed frame: ${JSON.stringify(got)}`);
	if (!got?.ok) fail(`the build failed: ${got?.error}`);
	if (got.recipe !== manifest.recipe) fail('its card names another recipe');
	console.log(`the world ${manifest.recipe.slice(0, 8)} built in WebKit's sealed frame (${got.group})`);
} finally {
	await browser.close();
}
