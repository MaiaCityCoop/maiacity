import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// three's compileAsync can wait forever on a node material under WebGLNodesHandler: every warm-up goes through
// render/core.js's precompile, which leaves node materials to compile as they are first drawn
describe('warm-ups', () => {
	it('call compileAsync only in render/core.js', () => {
		const src = join(import.meta.dirname, '../..'), found = [];
		const walk = (d) => {
			for (const f of readdirSync(d)) {
				const p = join(d, f);
				if (statSync(p).isDirectory()) walk(p);
				else if (/\.(js|ts|svelte)$/.test(f) && !/\.test\./.test(f) && /compileAsync\(/.test(readFileSync(p, 'utf8'))) found.push(p.slice(src.length + 1));
			}
		};
		walk(src);
		expect(found).toEqual(['content/render/core.js']);
	});
});
