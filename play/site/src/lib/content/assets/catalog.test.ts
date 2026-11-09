// An asset is named by a hash (a build) or by a slot of its sandbox's pins (play/SPEC.md §4.6): the catalog resolves
// both, and the worlds name their slots by exactly these refs.
import { describe, expect, it, vi } from 'vitest'

const R = 'f'.repeat(64)
vi.mock('../game/code/index.js', () => ({
	configKey: (id: string, name: string) => `configs/${id}/${name}`,
	loadConfig: async () => ({}),
	configAt: (ref: string) => {
		if (ref === 'configs/9862777e-04c2-8362-b028-27ff7e0591b8/assets') return { pallet: R, plant: `${R}?seed=a` }
		throw new Error(`${ref} is not loaded`)
	}
}))

// @ts-ignore — plain JS
const { resolve, NotInCatalog } = await import('./catalog.js')
// @ts-ignore — plain JS
const { SANDBOX } = await import('./sandboxes.js')
// @ts-ignore — plain JS
const { PALLET } = await import('../factories/pallet.js')
// @ts-ignore — plain JS
const { THINGS } = await import('../maiacity-v2/things.js')
// @ts-ignore — plain JS
const { plantRef } = await import('../maiacity-v2/plants.js')
// @ts-ignore — plain JS
const { refOf } = await import('../sandbox-2/interior/flora.js')

describe('a name of an asset', () => {
	it('resolves a build and a slot, the slot its pin then its own values', () => {
		expect(resolve(`${R}?stage=2`)).toEqual({ hash: R, params: { stage: '2' } })
		expect(resolve(PALLET)).toEqual({ hash: R })
		expect(resolve(`pin:${SANDBOX.factories}/plant?stage=4`)).toEqual({ hash: R, params: { seed: 'a', stage: '4' } })
		expect(() => resolve('plants/fern@2')).toThrow(NotInCatalog)
		expect(() => resolve(`pin:${SANDBOX.factories}/gone`)).toThrow(/pins no asset in slot gone/)
	})

	it('is written the same by every world that names a slot', () => {
		expect(PALLET).toBe('pin:9862777e-04c2-8362-b028-27ff7e0591b8/pallet')
		expect(THINGS.pickup).toBe('pin:a2af9568-53c6-8917-a816-da88d3ff66ff/pickup')
		expect(plantRef({ id: 'apple' }, 7, 'a b')).toBe('pin:a2af9568-53c6-8917-a816-da88d3ff66ff/plant-apple?stage=7&seed=a%20b')
		expect(refOf({ id: 'x', asset: `${R}?v=1`, stage: 3, seed: 's/1' })).toBe(`${R}?v=1&stage=3&seed=s%2F1`)
		expect(refOf({ id: 'x', asset: R, stage: 3, seed: 's' })).toBe(`${R}?stage=3&seed=s`)
	})
})
