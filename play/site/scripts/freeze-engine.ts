/**
 * Freezes the asset box's engine as its next version (brought back from the snapshot's aven/kernel/freeze-engine.mjs
 * as play's own, intent 6fd5e63f): src/lib/content/assets/box/engine.js bundled with rolldown into one script, three.js
 * in it, and, if it is not the latest frozen box engine byte for byte, written to static/engines/engine-v<n>.js with
 * its entry (its BLAKE3 hash, size, three.js and the modules it lends a recipe) in src/lib/kernel/sandbox/engines.json.
 * A frozen engine is never changed or removed: what was made for it runs on it for good.
 *
 *   bun scripts/freeze-engine.ts "what the new engine brings"     freeze it
 *   bun scripts/freeze-engine.ts --hash                           only print the hash the engine bundles to now
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rolldown } from 'rolldown';
import { hashBytes } from '../src/lib/content/game/hash.js';

const SITE = resolve(import.meta.dir, '..');
const LIST = `${SITE}/src/lib/kernel/sandbox/engines.json`;
const ENGINE = `${SITE}/src/lib/content/assets/box/engine.js`;

/** the engine as one script, three.js in it, as the box runs it */
async function bundleEngine(): Promise<string> {
	const b = await rolldown({ input: ENGINE, platform: 'browser', resolve: { alias: { $lib: `${SITE}/src/lib` } }, logLevel: 'silent' });
	try {
		const { output } = await b.generate({ format: 'iife', minify: true, codeSplitting: false } as any);
		return (output.find((o: any) => o.type === 'chunk') as any).code;
	} finally {
		await b.close();
	}
}

if (import.meta.main) {
	const code = await bundleEngine();
	const bytes = new TextEncoder().encode(code);
	const blake3 = hashBytes(bytes);
	if (process.argv[2] === '--hash') {
		console.log(`${blake3} ${bytes.length}`);
		process.exit(0);
	}
	const manifest = JSON.parse(readFileSync(LIST, 'utf8'));
	const list = manifest.box as { v: number; blake3: string }[];
	if (list.at(-1)?.blake3 === blake3) {
		console.log(`box engine v${list.at(-1)!.v} is the engine as it is now (${blake3.slice(0, 16)}…): nothing to freeze`);
		process.exit(0);
	}
	const note = process.argv[2];
	if (!note) {
		console.error('say what the new engine brings: bun scripts/freeze-engine.ts "…"');
		process.exit(1);
	}
	const { MODULES } = await import('../src/lib/content/assets/box/modules.js');
	const three = JSON.parse(readFileSync(`${SITE}/node_modules/three/package.json`, 'utf8')).version;
	const v = (list.at(-1)?.v ?? 0) + 1;
	writeFileSync(`${SITE}/static/engines/engine-v${v}.js`, code);
	list.push({ v, date: new Date().toISOString().slice(0, 10), blake3, bytes: bytes.length, three, modules: Object.keys(MODULES), note } as any);
	writeFileSync(LIST, JSON.stringify(manifest, null, '\t') + '\n');
	console.log(`froze box engine v${v}: ${blake3}, ${(bytes.length / 1024).toFixed(0)} KB`);
}
