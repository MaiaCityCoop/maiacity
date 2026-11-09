// The garden names each plant by its build, its stage and seed after the build's own values.
import { expect, it } from 'vitest'
// @ts-ignore — plain JS
import { refOf } from './flora.js'

const R = 'f'.repeat(64)
it('names a planting by its build, stage and seed', () => {
	expect(refOf({ id: 'x', v: 1, asset: `${R}?v=1`, stage: 3, seed: 's/1' })).toBe(`${R}?v=1&stage=3&seed=s%2F1`)
	expect(refOf({ id: 'x', v: 1, asset: R, stage: 3, seed: 's' })).toBe(`${R}?stage=3&seed=s`)
})
