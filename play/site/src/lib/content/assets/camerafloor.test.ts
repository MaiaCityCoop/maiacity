// The asset viewer's camera above the ground in every group's viewer but the plants' (intent 119a02d1).
import { describe, expect, it } from 'vitest';
import { keepAbove, mayGoBelow, maxPolar } from './camerafloor.js';

const GROUPS = ['machines', 'buildings', 'things', 'biomes', 'worlds', 'actors', 'animals', 'factories'];
/** the eye's height on an orbit round a point at targetY, `distance` away, `polar` from straight above */
const eyeY = (targetY: number, distance: number, polar: number) => targetY + distance * Math.cos(polar);

describe('the asset viewer camera', () => {
	it('camera stays above the ground', () => {
		// plants may look below the ground line (their roots); no other group may
		expect(mayGoBelow('plants')).toBe(true);
		expect(maxPolar('plants', { soiled: true })).toBeCloseTo(Math.PI * (5 / 6));
		for (const g of GROUPS) {
			expect(mayGoBelow(g)).toBe(false);
			// a drag down as far as it goes, a scroll or a pinch out, at every height and distance: the eye stays over the floor
			for (const targetY of [0, 0.05, 0.5, 2, 12])
				for (const distance of [0.1, 1, 5, 40, 400]) {
					const p = maxPolar(g, { targetY, groundY: 0, distance, margin: 0.005 });
					expect(eyeY(targetY, distance, p)).toBeGreaterThanOrEqual(0.005 - 1e-9);
				}
			// near a tall building's foot the eye may still look up at it (lower than straight across)
			expect(maxPolar(g, { targetY: 12, groundY: 0, distance: 5 })).toBeGreaterThan(Math.PI / 2);
			// a pan or a key that took eye and point under the floor: both lifted back over it
			const eye = { y: -3 }, target = { y: -1 };
			expect(keepAbove(g, eye, target, 0, 0.005)).toBe(true);
			expect(target.y).toBe(0);
			expect(eye.y).toBeGreaterThanOrEqual(0.005);
		}
		// a plant's camera is left where it is, below the ground included
		const eye = { y: -0.4 }, target = { y: -0.2 };
		expect(keepAbove('plants', eye, target, 0)).toBe(false);
		expect(eye.y).toBe(-0.4);
	});
});
