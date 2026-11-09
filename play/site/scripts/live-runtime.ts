/**
 * The live shot's runtime (src/lib/stories/live-runtime.ts, intent f270269e) bundled into the one script a composition
 * with a live shot loads from play's files by its hash (compose.ts VENDOR.live). The bundle is the asset library's own
 * code (its rebuild, card check, hero and stage) and the site's own three.js, not minified; the asset itself is built
 * by the frozen box engine, which is not in it. The same sources give the same bytes, so the hash pinned in compose.ts
 * is checked here.
 *
 * It is kept frozen beside the site, play/site/static/live/live-runtime.js (served by the site as its box engines are, and
 * handed by the Stories player to the frame, held to its hash): --pin writes it there and its hash into compose.ts; --check builds it again and
 * holds both to the hash compose.ts pins.
 *
 *   bun scripts/live-runtime.ts [--out file] [--check | --pin]
 */
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { compileModule } from 'svelte/compiler';
import { HEX, hashText } from '../src/lib/kernel/hash.js';

const SITE = resolve(import.meta.dir, '..');

/** the runtime's text */
export async function liveRuntime(): Promise<string> {
	const r = await Bun.build({
		entrypoints: [resolve(SITE, 'src/lib/stories/live-runtime.ts')],
		root: SITE,
		target: 'browser',
		format: 'iife',
		minify: false,
		define: { 'import.meta.env.DEV': 'false', 'import.meta.env': '{}' },
		plugins: [
			{
				name: 'site',
				setup(b) {
					b.onResolve({ filter: /^\$lib\// }, (a) => ({ path: Bun.resolveSync('./' + a.path.slice(5), resolve(SITE, 'src/lib') + '/') }));
					b.onResolve({ filter: /^\$app\/paths$/ }, () => ({ path: 'paths', namespace: 'app' }));
					b.onLoad({ filter: /.*/, namespace: 'app' }, () => ({ contents: 'export const base = "";', loader: 'js' }));
					// a module with runes (the sky's time control, under the stage's sky) compiled as the site's build compiles it
					b.onLoad({ filter: /\.svelte\.js$/ }, (a) => ({ contents: compileModule(readFileSync(a.path, 'utf8'), { filename: a.path, generate: 'client', dev: false }).js.code, loader: 'js' }));
				}
			}
		]
	});
	if (!r.success) throw new Error(r.logs.join('\n'));
	return r.outputs[0].text();
}

if (import.meta.main) {
	const args = process.argv.slice(2);
	const text = await liveRuntime();
	const hash = hashText(text);
	const out = args[args.indexOf('--out') + 1];
	if (args.includes('--out') && out) writeFileSync(out, text);
	console.log(`live runtime ${hash} (${text.length} bytes)`);
	const KEPT = resolve(SITE, 'static/live/live-runtime.js');
	if (args.includes('--pin')) {
		writeFileSync(KEPT, text);
		const at = resolve(SITE, 'src/lib/stories/compose.ts');
		writeFileSync(at, readFileSync(at, 'utf8').replace(new RegExp(`const LIVE_HASH = '${HEX}';`), `const LIVE_HASH = '${hash}';`));
	}
	if (args.includes('--check')) {
		const { VENDOR } = await import('../src/lib/stories/compose');
		if (VENDOR.live.hash !== hash) {
			console.error(`compose.ts pins ${VENDOR.live.hash}: build it again and pin ${hash}`);
			process.exit(1);
		}
		const kept = hashText(readFileSync(KEPT, 'utf8'));
		if (kept !== hash) {
			console.error(`static/live/live-runtime.js hashes to ${kept}, not ${hash}: pin it again`);
			process.exit(1);
		}
	}
}
