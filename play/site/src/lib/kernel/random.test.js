import { describe, expect, it } from 'vitest';
import { seededLcg, seededRandom } from './random.js';

const first = (/** @type {() => number} */ r, n = 4) => Array.from({ length: n }, r);

// the numbers the copies it replaced gave (biomes/noise.js rng, models/minidomes.js, game/map's mulberry32), so no
// world, dome or map moves
describe('seededRandom', () => {
	it('gives mulberry32 as the worlds were laid out with', () => {
		expect(first(seededRandom(7))).toEqual([0.011704753153026104, 0.06195825757458806, 0.97690763277933, 0.6990287057124078]);
		expect(first(seededRandom(42))).toEqual([0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693]);
		expect(first(seededRandom(-5))).toEqual([0.48384718922898173, 0.05296749505214393, 0.9390332337934524, 0.7963776015676558]);
	});
	it('takes a seed of 0 as 1, as the biomes did', () => {
		expect(first(seededRandom(0))).toEqual(first(seededRandom(1)));
	});
});

describe('seededLcg', () => {
	it("gives the van's numbers", () => {
		let s = 3;
		const van = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
		expect(first(seededLcg(3), 8)).toEqual(first(van, 8));
	});
});
