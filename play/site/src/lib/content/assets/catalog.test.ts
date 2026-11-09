// An asset is named by a hash (a build) or by a slot of its sandbox's pins (play/SPEC.md §4.6): the catalog resolves
// both (the refs each world writes are pinned beside it).
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
const { SANDBOX } = await import('../../kernel/sandboxes.js')

describe('a name of an asset', () => {
	it('resolves a build and a slot, the slot its pin then its own values', () => {
		expect(resolve(`${R}?stage=2`)).toEqual({ hash: R, params: { stage: '2' } })
		expect(resolve(`pin:${SANDBOX.factories}/pallet`)).toEqual({ hash: R })
		expect(resolve(`pin:${SANDBOX.factories}/plant?stage=4`)).toEqual({ hash: R, params: { seed: 'a', stage: '4' } })
		expect(() => resolve('plants/fern@2')).toThrow(NotInCatalog)
		expect(() => resolve(`pin:${SANDBOX.factories}/gone`)).toThrow(/pins no asset in slot gone/)
	})

})
