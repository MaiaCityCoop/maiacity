// The turntable's stage fills the whole height (intent cd431267): its head's row floats over the canvas's top edge with
// no band of its own, and the camera frames the thing clear of it.
import { readFileSync } from 'node:fs';
import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { fit } from './turntable.js';

const source = readFileSync(new URL('./Turntable.svelte', import.meta.url), 'utf8');
const css = source.slice(source.indexOf('<style>'), source.indexOf('</style>'));

/** every rule whose selector list matches `pick`: its declarations, as { property: value } */
function rules(pick) {
	const out = [];
	for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const sel = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim();
		if (!sel.split(',').some((s) => pick(s.trim()))) continue;
		out.push(Object.fromEntries([...m[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()])));
	}
	return out;
}

describe('the turntable, full height', () => {
	it('full height: the head lies over the canvas, its own background transparent, in every mode', () => {
		const head = rules((s) => /\.head$/.test(s) && !/:not|:has/.test(s));
		expect(head.length).toBeGreaterThan(0);
		const laid = Object.assign({}, ...head);
		expect(laid.position).toBe('absolute');
		expect(laid.top).toBe('0');
		expect(laid.background).toBe('transparent');
		// nothing puts it back in the flow above the canvas, or gives it a band: not the fill, compact or sticky one
		for (const r of head) {
			expect(r.position ?? 'absolute').toBe('absolute');
			expect(r.background ?? 'transparent').toBe('transparent');
			expect(r['border-bottom']).toBeUndefined();
			expect(r['backdrop-filter']).toBeUndefined();
		}
		// the row keeps clear of the notch
		expect(laid.padding).toMatch(/env\(safe-area-inset-top/);
	});

	it('full height: the canvas starts at the top, the stage taking all the view', () => {
		for (const r of rules((s) => /\.(stage|canvas)$/.test(s))) {
			expect(r.top ?? '0').toBe('0');
			expect(r['margin-top']).toBeUndefined();
			expect(r['padding-top']).toBeUndefined();
		}
		// its chips and labels are pills of the nav pill's look, over the scene
		const pill = Object.assign({}, ...rules((s) => s.includes('.head') && s.includes(':is(.chip')));
		expect(pill.background).toMatch(/--overlay-paper/);
		expect(pill['backdrop-filter']).toMatch(/blur/);
		expect(pill['border-radius']).toBe('999px');
	});

	it('full height: the camera frames the thing under the row, the view going on up behind it', () => {
		const plain = new PerspectiveCamera(40, 1, 0.1, 100);
		plain.userData.fov = 40;
		fit(plain, 390, 844 - 120);
		const roomed = new PerspectiveCamera(40, 1, 0.1, 100);
		roomed.userData.fov = 40;
		roomed.userData.top = 120;
		fit(roomed, 390, 844);
		// framed as on the canvas under the row: the same aspect and field of view
		expect(roomed.aspect).toBeCloseTo(plain.aspect);
		expect(roomed.fov).toBeCloseTo(plain.fov);
		expect(roomed.view?.enabled).toBe(true);
		expect(roomed.view.offsetY).toBe(-120);
		expect(roomed.view.height).toBe(844);
		// a point in the middle of the old canvas is in the middle of the canvas under the row
		const p = plain.position.clone().set(0, 0, -10);
		const ndc = p.clone().applyMatrix4(roomed.projectionMatrix);
		const y = ((1 - ndc.y) / 2) * 844;
		expect(y).toBeCloseTo(120 + (844 - 120) / 2, 3);
		// no row, no offset
		roomed.userData.top = 0;
		fit(roomed, 390, 844);
		expect(roomed.view?.enabled ?? false).toBe(false);
	});
});
