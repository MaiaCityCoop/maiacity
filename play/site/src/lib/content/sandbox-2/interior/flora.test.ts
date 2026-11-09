import { afterEach, describe, expect, it, vi } from 'vitest'
import { createForest, didNotGrow, type FloraDrawn } from './flora.js'

/** a kind as the renderer gives it back: built, one level with nothing drawn in it */
const kindOf = () => ({ ready: Promise.resolve(), base: 0, levels: [{ level: { draws: [] } }] })

/** the renderer a forest draws by, its `use` refusing the refs `refuses` names as the asset box refuses a setting */
function drawn(refuses: (ref: string) => string | null): FloraDrawn {
	return {
		use: (ref: string) => {
			const why = refuses(ref)
			if (why) return { ready: Promise.reject(new Error(why)) }
			return kindOf()
		},
		take: () => ({}),
		give: () => {},
		far: () => 20,
		assets: { stats: () => ({ tris: 0 }) }
	}
}

const kind = (id: string, stage: number) => ({ id, v: 2, asset: `${id.padEnd(64, '0')}`, stage, seed: 'sandbox-5' })

describe('flora: a plant that does not grow', () => {
	afterEach(() => {
		didNotGrow.length = 0
		vi.restoreAllMocks()
	})

	it('a plant that does not grow is a counted failure, not only a warning, and the rest grow', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const forest = createForest({ flora: drawn((ref) => (ref.startsWith('moringa') ? 'plants/moringa takes no parameters' : null)) })
		forest.add(kind('moringa', 9), 'tree', 0, 0, 0, 0, 1)
		forest.add(kind('apple', 9), 'tree', 5, 0, 5, 0, 1)

		const failed = await forest.grown()

		// given back by the forest, and kept for the census to count
		expect(failed).toEqual([{ kind: 'moringa@2:9:sandbox-5', error: 'plants/moringa takes no parameters' }])
		expect(didNotGrow).toEqual(failed)
		// reported as an error, never only warned
		expect(error).toHaveBeenCalledWith('flora: moringa@2:9:sandbox-5 did not grow: plants/moringa takes no parameters')
		expect(warn).not.toHaveBeenCalled()
		// the plant that grew is measured: it stands
		expect(forest.shape(kind('apple', 9))).toBeDefined()
		expect(forest.shape(kind('moringa', 9))).toBeUndefined()
	})

	it('a stage past the recipe\'s range is a counted failure too, and a forest that all grows counts none', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const range = (ref: string) => (/stage=1[1-3]/.test(ref) ? `stage: ${ref.match(/stage=(\d+)/)![1]} is out of 0–10` : null)
		const forest = createForest({ flora: drawn(range) })
		forest.add(kind('mango', 12), 'tree', 0, 0, 0, 0, 1)
		forest.add(kind('mango', 9), 'tree', 3, 0, 3, 0, 1)
		expect((await forest.grown()).map((f) => f.kind)).toEqual(['mango@2:12:sandbox-5'])

		const whole = createForest({ flora: drawn(() => null) })
		whole.add(kind('mango', 9), 'tree', 0, 0, 0, 0, 1)
		expect(await whole.grown()).toEqual([])
		expect(didNotGrow).toHaveLength(1)
	})
})
