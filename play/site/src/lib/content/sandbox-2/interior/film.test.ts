// Sandbox 1's film steps (intent 660ad67f): the village built on the CPU and its film advanced, as every film or story
// that shows it does (../../../../../scripts/census/film.ts, in Bun with the census's pinned inputs). Since 2214e661 the
// sky's sun is three's SunLight, which has no target: the glass's sun sheen is its own direction.
import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../../../../scripts/census/film.ts', import.meta.url));

describe("Sandbox 1's film", () => {
	test('advances at 0, 30 and 600 s, the glass sheen a unit vector toward the sun', () => {
		const out = execFileSync('bun', [script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600_000, maxBuffer: 64 << 20 });
		const { steps } = JSON.parse(out.trim().split('\n').pop()!);
		expect(steps.map((s: { t: number }) => s.t)).toEqual([0, 30, 600]);
		for (const s of steps) {
			expect(s.length).toBeCloseTo(1, 5);
			expect(s.dot).toBeCloseTo(1, 5);
		}
	}, 600_000);
});
