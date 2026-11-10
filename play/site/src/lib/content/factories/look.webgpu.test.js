// The factories' look on WebGPU (intent c1bee1f8): its post (AO, bloom, output, tilt shift, grade) on a RenderPipeline,
// its room's light baked once the renderer may draw; on WebGPURenderer's WebGL 2 backend over a context that only answers.
import { describe, expect, test } from 'vitest';

const g = /** @type {any} */ (globalThis);
g.self ??= g;
g.window ??= g;
g.requestAnimationFrame ??= () => 0;
g.cancelAnimationFrame ??= () => {};
g.ImageBitmap ??= class {};
g.devicePixelRatio ??= 1;
const kept = { 'play.renderer': 'webgl2' };
g.localStorage = { getItem: (k) => kept[k] ?? null, setItem() {}, removeItem() {} };
const { fakeGL } = await import('../render/nodes/fakegl.js');
const { ready } = await import('../render/core.js');
const { Look } = await import('./look.js');

describe('the factories’ look on WebGPU', () => {
	test('its stack is a RenderPipeline with the tilt shift and the grade, and it draws', async () => {
		const { gl, shaders } = fakeGL();
		const c = /** @type {any} */ (gl.canvas);
		c.getContext = (/** @type {string} */ kind) => (kind === 'webgl2' ? gl : null);
		const look = /** @type {any} */ (new Look(c, { pixelRatio: 1 }));
		expect(look.renderer.isWebGPURenderer).toBe(true);
		expect(look.post?.pipeline).toBeTruthy();
		await ready(look.renderer);
		await Promise.resolve();
		look.setSize(64, 48);
		look.setTilt({ focusY: 0.46, band: 0.075, amount: 20 });
		look.render(0.016);
		expect(look.scene.environment?.isTexture).toBe(true);
		const frag = shaders.filter((s) => /void main/.test(s ?? '')).join('\n');
		// the grade's grain and the tilt's loop are in the programs
		expect(frag).toMatch(/43758\.5453/);
		expect(frag).toMatch(/for\s*\(/);
		look.composer.dispose();
	});
});
