// The render core's lint (intent b03f9fb4, c1 and c2; ./core.js): every page's renderer is made by createRenderer, its
// orbit controls by createControls and its composer by createComposer, and the picture's response (tone mapping and
// exposure) is set only through the core. Read from the site's sources as text.
import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const CORE = 'lib/content/render/core.js', POST = 'lib/content/render/post.js';

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
	test('every WebGLRenderer is made by createRenderer', () => {
		expect(outside(/WebGLRenderer\(/, [CORE])).toEqual([]);
		expect(outside(/new\s+(\w+\.)?WebGLRenderer\b/, [CORE])).toEqual([]);
	});
	// the switch (intent c1bee1f8): a WebGPURenderer too is made by createRenderer alone, behind its `backend`
	test('every WebGPURenderer is made by createRenderer', () => {
		expect(outside(/new\s+(\w+\.)?WebGPURenderer\b/, [CORE])).toEqual([]);
	});
	// the factories' `T.OrbitControls` and `T.EffectComposer` are the core's, under three's names (../factories/three.js)
	test('every OrbitControls and EffectComposer is the core’s', () => {
		expect(outside(/new\s+(?!T\.)(\w+\.)?OrbitControls\b/, [CORE, POST])).toEqual([]);
		expect(outside(/new\s+(?!T\.)(\w+\.)?EffectComposer\b/, [CORE, POST])).toEqual([]);
	});
	// the switch (intent c1bee1f8): a WebGPURenderer draws nothing before `init()`, so every page that makes a renderer
	// waits for it before its first frame: `ready(renderer)` or `makeRenderer`, or a stage's `.ready`. The factories'
	// Look is waited for by its app (../factories/app.js), and T.WebGLRenderer (../factories/three.js) is three's name kept
	test('every page that makes a renderer waits for it to be ready', () => {
		const makes = files.filter((f) => /\b(createRenderer|worldRenderer)\s*\(/.test(f.text) && !/\bfunction\s+(createRenderer|worldRenderer)\b/.test(f.text));
		const waits = (/** @type {{ text: string }} */ f) => /\bready\s*\(|\bmakeRenderer\s*\(/.test(f.text);
		expect(makes.filter((f) => !waits(f) && ![CORE, 'lib/content/render/stage.js', 'lib/content/render/world.js', 'lib/content/factories/three.js', 'lib/content/factories/look.js'].includes(f.path)).map((f) => f.path)).toEqual([]);
		const stages = files.filter((f) => /\b(createStageRenderer|createWorldRenderer)\s*\(/.test(f.text) && !/\bfunction\s+(createStageRenderer|createWorldRenderer)\b/.test(f.text));
		expect(stages.length).toBeGreaterThan(0);
		expect(stages.filter((f) => !/\.ready\b/.test(f.text)).map((f) => f.path)).toEqual([]);
		expect(files.find((f) => f.path === 'lib/content/factories/app.js')?.text).toMatch(/ready\(look\.renderer\)/);
	});
	// a compileAsync that gathers a node material never settles under WebGLNodesHandler: every warm-up is precompile's
	test('every warm-up goes through the core’s precompile', () => {
		expect(outside(/\bcompileAsync\s*\(/, [CORE])).toEqual([]);
	});
	test('tone mapping and exposure are set only through the core', () => {
		expect(outside(/\.toneMapping(Exposure)?\s*=[^=]/, [CORE])).toEqual([]);
	});
	// three's WebGLNodesHandler builds a node material only as it is drawn: a compileAsync over one never resolves and the
	// world draws nothing, so every warm-up goes through the core's precompile, which leaves node materials to their
	// first frame (intent 602a8849). The render kit's three (assets/stage.js, render/impostors.js, render/index.js)
	// compile only three's own materials until intent cb16b7a5 routes them through it.
	test('every warm-up is the core’s precompile', () => {
		const KIT = ['lib/content/assets/stage.js', 'lib/content/assets/render/impostors.js', 'lib/content/assets/render/index.js'];
		expect(outside(/compileAsync\(/, [CORE, ...KIT])).toEqual([]);
	});
});
