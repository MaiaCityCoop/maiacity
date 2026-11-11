/*
 * The page's pool of asset boxes (./pool.js, intent 08d00b84): N builds asked together are built in min(N, cores − 1)
 * boxes at once, the most wanted first, each in whichever box is free. Stand-in boxes the test answers by hand: no
 * clock, no worker. (The same builds from real workers: scripts/census/pool.bun.test.ts.)
 */
import { describe, expect, it, vi } from 'vitest'
import { createPool } from './pool.js'
import { budgetFor } from '$lib/content/render/budget.js'

type Open = { box: number; recipe: { hash: string }; done: (v: unknown) => void; fail: (e: Error) => void }

/** boxes whose builds the test answers by hand; `most` the most that ever built at once */
function hand() {
	const open: Open[] = []
	const seen = { made: 0, most: 0, stopped: 0 }
	const box = () => {
		const n = seen.made++
		return {
			start: () => Promise.resolve(),
			build: (recipe: { hash: string }) =>
				new Promise((done, fail) => {
					open.push({ box: n, recipe, done, fail })
					seen.most = Math.max(seen.most, open.length)
				}),
			stop: () => void seen.stopped++
		}
	}
	const answer = (hash: string, v: unknown = hash) => {
		const i = open.findIndex((o) => o.recipe.hash === hash)
		open.splice(i, 1)[0]!.done(v)
	}
	return { box, open, seen, answer }
}
/** every promise's turn run (no timer is ever waited for) */
const settled = async () => {
	for (let i = 0; i < 20; i++) await Promise.resolve()
}
const recipes = (n: number) => Array.from({ length: n }, (_, i) => ({ hash: `kind-${i}`, code: `recipe ${i}` }))

describe("a world's kinds are built on every core but one", () => {
	for (const cores of [2, 4, 8, 16])
		for (const n of [1, 3, 12, 40])
			it(`${n} kinds on a device of ${cores} cores build on min(${n}, ${cores} − 1) boxes at once`, async () => {
				const size = budgetFor(false, cores).builds
				// every core but one (two at least, eight at most: ../../render/budget.js)
				expect(size).toBe(Math.max(2, Math.min(8, cores - 1)))
				const h = hand()
				const pool = createPool({ engine: 5, size, box: h.box })
				const kinds = recipes(n)
				const built = kinds.map((r) => pool.build(r, {}))
				await settled()
				const atOnce = Math.min(n, size)
				expect(h.open.length).toBe(atOnce)
				expect(pool.building).toBe(atOnce)
				// each in a box of its own, and no box made that no build waits for
				expect(new Set(h.open.map((o) => o.box)).size).toBe(atOnce)
				expect(h.seen.made).toBe(atOnce)
				expect(pool.waiting).toBe(n - atOnce)
				// answered one by one, the next takes the box that came free: never more at once, never a box idle while one waits
				for (let left = n; left > 0; left--) {
					expect(h.open.length).toBe(Math.min(left, size))
					h.answer(h.open[0]!.recipe.hash)
					await settled()
				}
				expect(h.seen.most).toBe(atOnce)
				// every kind got its own build, whichever box built it
				expect(await Promise.all(built)).toEqual(kinds.map((k) => k.hash))
			})

	it('a phone builds two at once', async () => {
		const size = budgetFor(true, 6).builds
		expect(size).toBe(2)
		const h = hand()
		const pool = createPool({ engine: 5, size, box: h.box })
		recipes(9).forEach((r) => void pool.build(r, {}))
		await settled()
		expect(h.open.length).toBe(2)
	})

	it('the most wanted waiting is built first, asked again as each box comes free; alike, the first asked', async () => {
		const h = hand()
		const pool = createPool({ engine: 5, size: 2, box: h.box })
		const near = { 'kind-0': 0, 'kind-1': 0, 'kind-2': 1, 'kind-3': 5, 'kind-4': 5, 'kind-5': 2 } as Record<string, number>
		recipes(6).forEach((r) => void pool.build(r, {}, { rank: () => near[r.hash] }))
		await settled()
		// (its boxes come up a turn after the builds are asked: the two most wanted of all six, not the first two asked)
		expect(h.open.map((o) => o.recipe.hash)).toEqual(['kind-3', 'kind-4'])
		h.answer('kind-3')
		await settled()
		expect(h.open.map((o) => o.recipe.hash)).toEqual(['kind-4', 'kind-5'])
		// what is wanted changed while it waited (the eye moved)
		near['kind-1'] = 9
		h.answer('kind-4')
		await settled()
		expect(h.open.map((o) => o.recipe.hash)).toEqual(['kind-5', 'kind-1'])
		h.answer('kind-5')
		await settled()
		expect(h.open.map((o) => o.recipe.hash)).toEqual(['kind-1', 'kind-2'])
		h.answer('kind-1')
		await settled()
		expect(h.open.map((o) => o.recipe.hash)).toEqual(['kind-2', 'kind-0'])
	})

	it('a build that fails frees its box for the next, and fails alone', async () => {
		const h = hand()
		const pool = createPool({ engine: 5, size: 2, box: h.box })
		const built = recipes(3).map((r) => pool.build(r, {}))
		await settled()
		h.open[0]!.fail(new Error('its recipe threw'))
		h.open.splice(0, 1)
		await settled()
		await expect(built[0]).rejects.toThrow('its recipe threw')
		expect(h.open.map((o) => o.recipe.hash)).toEqual(['kind-1', 'kind-2'])
	})

	it('a build no longer wanted when its turn comes is not built', async () => {
		const h = hand()
		const pool = createPool({ engine: 5, size: 1, box: h.box })
		let gone = false
		const built = recipes(3).map((r, i) => pool.build(r, {}, { unwanted: () => i === 1 && gone }))
		await settled()
		gone = true
		h.answer('kind-0')
		await settled()
		await expect(built[1]).rejects.toThrow('no longer wanted')
		expect(h.open.map((o) => o.recipe.hash)).toEqual(['kind-2'])
	})

	it('a recipe built again goes to the box that built it, its worker warm, where that box is free; else to any free box', async () => {
		const h = hand()
		const pool = createPool({ engine: 5, size: 3, box: h.box })
		const [a, b, c] = recipes(3)
		;[a, b, c].forEach((r) => void pool.build(r!, {}))
		await settled()
		const boxOf = Object.fromEntries(h.open.map((o) => [o.recipe.hash, o.box]))
		for (const r of [a, b, c]) h.answer(r!.hash)
		await settled()
		// b again (its lower level, other values): to b's box, though another box is free before it
		void pool.build(b!, { detail: '0.25' })
		await settled()
		expect(h.open.map((o) => o.box)).toEqual([boxOf['kind-1']])
		// b once more while its box builds: not waited for, built in a free box
		void pool.build(b!, { detail: '0.1' })
		await settled()
		expect(h.open).toHaveLength(2)
		expect(h.open[1]!.box).not.toBe(boxOf['kind-1'])
	})

	it("its values and the build's own options are handed to the box as given; the pool's are kept back", async () => {
		const asked: unknown[][] = []
		const pool = createPool({ engine: 5, size: 1, box: () => ({ start: () => Promise.resolve(), build: (...a: unknown[]) => (asked.push(a), Promise.resolve('built')), stop() {} }) })
		expect(await pool.build({ hash: 'h', code: 'c' }, { detail: '0.2' }, { timeout: 900, rank: 3 })).toBe('built')
		expect(asked).toEqual([[{ hash: 'h', code: 'c' }, { detail: '0.2' }, { timeout: 900 }]])
	})
})

describe('a build asked for by two (two renderers of one page) is left unbuilt only when neither wants it', () => {
	it('loadAsset hands the pool one build for both, unwanted only once every asker is gone', async () => {
		vi.resetModules()
		const asked: { unwanted: () => boolean; done: (v: unknown) => void }[] = []
		vi.doMock('./pool.js', () => ({ poolOf: () => ({ build: (_r: unknown, _g: unknown, o: { unwanted: () => boolean }) => new Promise((done) => asked.push({ unwanted: o.unwanted, done })) }) }))
		const R = 'c'.repeat(64)
		vi.doMock('../catalog.js', () => ({
			INDEX: { engine: 7, recipes: {} },
			NotInCatalog: class extends Error {},
			buildOf: (h: string) => h,
			parseBuild: (n: string) => ({ hash: n, params: undefined }),
			loadRecipes: async () => {},
			heldAt: () => ({ label: 'Fern' }),
			cardOf: () => ({ engine: 5 }),
			declaredOf: () => undefined,
			recipeAt: async (h: string) => ({ hash: h, code: 'defineRecipe()' })
		}))
		const { loadAsset } = await import('../load.js')
		const store = { get: async () => undefined, put: async () => true, drop: async () => {} }
		const gone = { first: false, second: false }
		const loads = [loadAsset(R, { store, unwanted: () => gone.first }), loadAsset(R, { store, unwanted: () => gone.second })]
		loads.forEach((l) => l.catch(() => {}))
		for (let i = 0; i < 50; i++) await Promise.resolve()
		expect(asked.length).toBe(1)
		expect(asked[0]!.unwanted()).toBe(false)
		gone.first = true
		expect(asked[0]!.unwanted()).toBe(false)
		gone.second = true
		expect(asked[0]!.unwanted()).toBe(true)
		vi.doUnmock('./pool.js')
		vi.doUnmock('../catalog.js')
	})
})
