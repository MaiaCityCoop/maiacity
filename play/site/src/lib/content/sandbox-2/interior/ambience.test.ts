import { describe, expect, it } from 'vitest'
import { startAt } from './ambience'

describe('startAt: where a looping recording starts', () => {
	it('is a random point within a finite duration', () => {
		expect(startAt(300, () => 0.5)).toBe(149.5)
		expect(startAt(300, () => 0)).toBe(0)
		for (let i = 0; i < 100; i++) {
			const t = startAt(300)
			expect(Number.isFinite(t)).toBe(true)
			expect(t).toBeGreaterThanOrEqual(0)
			expect(t).toBeLessThan(299)
		}
	})
	it('is 0 for a stream whose length is not known yet (Infinity)', () => {
		expect(startAt(Infinity)).toBe(0)
	})
	it('is 0 for a duration that is NaN', () => {
		expect(startAt(NaN)).toBe(0)
	})
	it('is 0 for a recording of a second or less', () => {
		expect(startAt(1)).toBe(0)
		expect(startAt(0)).toBe(0)
	})
})
