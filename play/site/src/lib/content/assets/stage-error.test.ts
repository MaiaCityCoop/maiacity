// What the asset viewer says when its 3D stage did not open (./stage-error.js; intent 8333276b): a chunk that would not
// load told apart from a browser without 3D.
import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/environment', () => ({ version: 'build-a' }));
vi.mock('$app/navigation', () => ({ beforeNavigate: () => {} }));
vi.mock('$app/state', () => ({ page: { url: new URL('http://play.test/') }, updated: { current: false, check: async () => false } }));

const { stageError } = await import('./stage-error.js');

describe('the stage that did not open', () => {
	test('a chunk that would not load is the page’s, as each browser says it', () => {
		for (const said of [
			"'text/html' is not a valid JavaScript MIME type.", // Safari, handed the page for a script
			'Importing a module script failed.', // Safari, a 404
			'Failed to fetch dynamically imported module: https://play.maia.city/_app/immutable/chunks/BxYz.js', // Chromium
			'error loading dynamically imported module: https://play.maia.city/_app/immutable/chunks/BxYz.js', // Firefox
			'Unable to preload CSS for /_app/immutable/assets/stage.css' // Vite
		]) {
			const m = stageError(new TypeError(said));
			expect(m).toContain('A part of this page could not be loaded');
			expect(m).toContain('reload the page');
			expect(m).toContain(said);
			expect(m).not.toContain('This browser');
		}
	});

	test('a renderer that could not be made is a browser without 3D', () => {
		for (const e of [new Error('WebGPU is not supported and no WebGL2 context could be created'), new Error('requestDevice failed'), 'no adapter']) {
			const m = stageError(e);
			expect(m).toBe(`This browser couldn’t open the 3D stage: ${e instanceof Error ? e.message : e}`);
		}
	});
});
