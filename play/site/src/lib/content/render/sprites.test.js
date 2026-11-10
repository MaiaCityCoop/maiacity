// A dot's size is CSS pixels on every screen (intent cef10a08): its quad's clip-space offset, `px * 2 / screen`, the
// same at pixel ratio 2 as at 1 for the same CSS canvas, as three's PointsMaterial without attenuation drew.
import { expect, test } from 'vitest';
import * as THREE from 'three';
import { dots } from './sprites.js';

globalThis.self ??= globalThis;

const renderer = (pixelRatio, w = 800, h = 600) => ({
	getSize: (v) => v.set(w, h),
	getDrawingBufferSize: (v) => v.set(w * pixelRatio, h * pixelRatio)
});

test('css pixels: a dot is as wide at pixel ratio 2 as at 1', () => {
	const offset = (pixelRatio) => {
		const d = dots({ color: '#f00', px: 7 });
		d.mesh.onBeforeRender(renderer(pixelRatio));
		const o = new THREE.Vector2(7 * 2, 7 * 2).divide(d.screen.value);
		d.dispose();
		return [o.x, o.y];
	};
	expect(offset(2)).toEqual(offset(1));
	expect(offset(1)).toEqual([14 / 800, 14 / 600]);
});
