/**
 * FREEZE THE BOX ENGINE (intent a5faafad: engine 6, box data format 5) — the asset box's engine as it is now
 * (src/lib/content/assets/box/engine/engine.js and what it imports: three.js and the modules it lends recipes, the
 * box's second lock, the serializer, the bake, the view, the clips) bundled into one script with rolldown, as the
 * engines before it were (the snapshot's aven/kernel/freeze-engine.mjs), and frozen as its next version: its file
 * static/engines/engine-v<n>.js and its entry in src/lib/kernel/sandbox/engines.json (its BLAKE3 hash, size, the
 * three.js it carries, its modules, what it brings). A frozen engine never changes: what was made for it runs on it for
 * good. `--check` only says whether the source as it is now is the latest frozen engine, byte for byte.
 *
 *   bun scripts/freeze-engine.ts "what the new engine brings"
 *   bun scripts/freeze-engine.ts --check
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { rolldown } from 'rolldown';
import { hashText } from '../src/lib/content/game/hash.js';
import { MODULES } from '../src/lib/content/assets/box/engine/modules.js';

const SITE = resolve(import.meta.dir, '..');
const ENGINE = resolve(SITE, 'src/lib/content/assets/box/engine/engine.js');
const LIST = resolve(SITE, 'src/lib/kernel/sandbox/engines.json');

/** the engine as one script, three.js in it */
export async function bundleEngine(): Promise<string> {
	const b = await rolldown({ input: ENGINE, platform: 'browser', logLevel: 'silent' });
	try {
		const { output } = await b.generate({ format: 'iife', minify: true, codeSplitting: false });
		return (output.find((o) => o.type === 'chunk') as { code: string }).code;
	} finally {
		await b.close();
	}
}

if (import.meta.main) {
	const check = process.argv[2] === '--check';
	const note = check ? '' : (process.argv[2] ?? '');
	const manifest = JSON.parse(readFileSync(LIST, 'utf8'));
	const list = manifest.box as { v: number; blake3: string }[];
	const code = await bundleEngine();
	const blake3 = hashText(code);
	const latest = list.at(-1)!;
	if (latest.blake3 === blake3) {
		console.log(`box engine v${latest.v} is the engine as it is now (${blake3.slice(0, 16)}…): nothing to freeze`);
		process.exit(0);
	}
	if (check) {
		console.error(`the box engine's source changed since v${latest.v} was frozen (${blake3.slice(0, 16)}…): freeze v${latest.v + 1}, or undo the change`);
		process.exit(1);
	}
	if (!note) {
		console.error('say what the new engine brings: bun scripts/freeze-engine.ts "…"');
		process.exit(1);
	}
	const v = latest.v + 1;
	writeFileSync(resolve(SITE, `static/engines/engine-v${v}.js`), code);
	const three = JSON.parse(readFileSync(resolve(SITE, 'node_modules/three/package.json'), 'utf8')).version;
	list.push({ v, date: new Date().toISOString().slice(0, 10), blake3, bytes: Buffer.byteLength(code), three, modules: Object.keys(MODULES), note } as any);
	writeFileSync(LIST, JSON.stringify(manifest, null, '\t') + '\n');
	console.log(`froze box engine v${v}: ${blake3}, ${(Buffer.byteLength(code) / 1024).toFixed(0)} KB`);
}
