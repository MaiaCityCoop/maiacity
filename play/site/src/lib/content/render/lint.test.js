// The render core's lint (intent b03f9fb4, c1 and c2; ./core.js; intent c1bee1f8): every page's renderer is a
// WebGPURenderer made by createRenderer, its orbit controls by createControls, its post stack by createPost (no
// classic renderer, composer or handler anywhere), and the picture's response (tone mapping and exposure) is set only
// through the core. Read from the site's sources as text.
import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const CORE = 'lib/content/render/core.js';

/** every source file under src, its path from src and its text (tests and this lint left out) */
function sources() {
	/** @type {{ path: string, text: string }[]} */
	const out = [];
	const walk = (/** @type {string} */ dir) => {
		for (const n of readdirSync(dir)) {
			const p = join(dir, n);
			if (statSync(p).isDirectory()) walk(p);
			else if (/\.(js|ts|svelte)$/.test(n) && !/\.test\.(js|ts)$/.test(n)) out.push({ path: relative(SRC, p).split('\\').join('/'), text: readFileSync(p, 'utf8') });
		}
	};
	walk(SRC);
	return out;
}
const files = sources();
/** the files whose text matches `re`, but those allowed */
const outside = (/** @type {RegExp} */ re, /** @type {string[]} */ allowed) => files.filter((f) => re.test(f.text) && !allowed.includes(f.path)).map((f) => f.path);

describe('the render core holds', () => {
	test('it reads the site', () => expect(files.some((f) => f.path === CORE)).toBe(true));
	// three's classic renderer, its post-processing composer and its node handler are gone (intent c1bee1f8): named here
	// in pieces, so this file is no mention of them
	test('nothing draws with three’s classic renderer', () => {
		const gl = 'Web' + 'GL';
		expect(outside(new RegExp(`\\b${gl}Renderer\\b`), [])).toEqual([]);
		expect(outside(new RegExp(`\\b${gl}NodesHandler\\b`), [])).toEqual([]);
		expect(outside(new RegExp(`\\b${'Effect'}Composer\\b|postprocessing/`), [])).toEqual([]);
	});
	test('every WebGPURenderer is made by createRenderer', () => {
		expect(outside(/new\s+(\w+\.)?WebGPURenderer\b/, [CORE])).toEqual([]);
	});
	test('every OrbitControls is the core’s (the factories’ `T.OrbitControls` is it, under three’s name)', () => {
		expect(outside(/new\s+(?!T\.)(\w+\.)?OrbitControls\b/, [CORE])).toEqual([]);
	});
	// the switch (intent c1bee1f8): a WebGPURenderer draws nothing before `init()`, so every page that makes a renderer
	// waits for it before its first frame: `ready(renderer)` or `makeRenderer`, or a stage's `.ready`. The factories'
	// Look is waited for by its app (../factories/app.js)
	test('every page that makes a renderer waits for it to be ready', () => {
		const makes = files.filter((f) => /\b(createRenderer|worldRenderer)\s*\(/.test(f.text) && !/\bfunction\s+(createRenderer|worldRenderer)\b/.test(f.text));
		const waits = (/** @type {{ text: string }} */ f) => /\bready\s*\(|\bmakeRenderer\s*\(/.test(f.text);
		expect(makes.filter((f) => !waits(f) && ![CORE, 'lib/content/render/stage.js', 'lib/content/render/world.js', 'lib/content/factories/look.js'].includes(f.path)).map((f) => f.path)).toEqual([]);
		// (the sandbox kit's `createStage` is createWorldRenderer under its kit name: ../sandbox-kit/index.js)
		const stages = files.filter((f) => /\b(createStageRenderer|createWorldRenderer|createStage)\s*\(/.test(f.text) && !/\bfunction\s+(createStageRenderer|createWorldRenderer)\b/.test(f.text));
		expect(stages.length).toBeGreaterThan(0);
		expect(stages.filter((f) => !/\.ready\b/.test(f.text)).map((f) => f.path)).toEqual([]);
		expect(files.find((f) => f.path === 'lib/content/factories/app.js')?.text).toMatch(/ready\(look\.renderer\)/);
	});
	// every warm-up is precompile's, one at a time on a renderer (./core.js)
	test('every warm-up goes through the core’s precompile', () => {
		expect(outside(/\bcompileAsync\s*\(/, [CORE])).toEqual([]);
	});
	test('tone mapping and exposure are set only through the core', () => {
		expect(outside(/\.toneMapping(Exposure)?\s*=[^=]/, [CORE])).toEqual([]);
	});
});
