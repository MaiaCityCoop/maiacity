// The asset viewer's build (`vaultBuild`): what it reads, what it keeps and under which key, and what it says when it
// can't, so the viewer and the Worlds page get the same answer however it is made.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../box/rebuild.js', () => ({ rebuild: (data: any) => ({ rebuilt: data }) }))
vi.mock('../schemas/index.js', () => ({ checkCard: (card: any) => (card?.fits ? { ok: true, errors: [] } : { ok: false, errors: ['no fit'] }) }))

// @ts-ignore — plain JS
const { vaultBuild } = await import('./viewer.js')
// @ts-ignore — plain JS
const cache = await import('../cache/builds.js')
// @ts-ignore — plain JS
const catalog = await import('../catalog.js')
// @ts-ignore — plain JS
const { LATEST } = await import('../box/engines.js')
// @ts-ignore — plain JS
const { TIMEOUT } = await import('../box/host.js')
// @ts-ignore — plain JS
const { hashText } = await import('../../../kernel/hash.js')

// two recipes handed to the page's catalog (as the benches hand theirs): one that takes values, one that takes none
const CODE = 'defineRecipe(() => ({ fern: 2 }))', BARE = 'defineRecipe(() => ({ stone: 1 }))'
const R = hashText(CODE), R0 = hashText(BARE)
const params = [{ id: 'seed', label: 'Seed', type: 'string', value: 'maia' }, { id: 'stage', label: 'Stage', type: 'integer', min: 0, max: 9, value: 3 }]
catalog.admitHanded([
	{ hash: R, code: CODE, group: 'plants', id: 'fern', v: 2, label: 'Fern v2', params },
	{ hash: R0, code: BARE, group: 'things', id: 'stone', v: 1, label: 'Fern v2' }
])
const source = (p: any = params) => ({ ...catalog.source, recipeAt: vi.fn(catalog.source.recipeAt) })
const R_OF = (p: any = params) => (p.length ? R : R0)
const built = { data: { nodes: [] }, card: { fits: true, recipe: R } }
let store: any, box: any
beforeEach(() => {
	const kept = new Map<string, any>()
	store = { get: vi.fn(async (k: string) => kept.get(k)), put: vi.fn(async (k: string, b: any) => (kept.set(k, b), true)), drop: vi.fn(async (k: string) => kept.delete(k)) }
	box = { engine: LATEST.v, build: vi.fn(async () => built) }
})

describe('vaultBuild', () => {
	it('builds in the box, then keeps it under its key, and finds it there next time', async () => {
		const phases: string[] = []
		const s = source()
		const a = await vaultBuild(s, R, { stage: '9' }, { box, store, phase: (p: string) => phases.push(p) })
		expect(a.from).toBe('box')
		expect(a.name).toBe(`${R}?seed=maia&stage=9`)
		expect(a.label).toBe('Fern v2')
		expect(a.given).toEqual({ seed: 'maia', stage: '9' })
		expect(a.obj).toEqual({ rebuilt: built.data })
		expect(box.build).toHaveBeenCalledWith({ hash: R, code: CODE, pieces: [] }, { seed: 'maia', stage: '9' }, { timeout: TIMEOUT })
		expect(await a.stored).toBe(true)
		const key = cache.keyOf({ engine: LATEST.blake3, recipe: R, params: { seed: 'maia', stage: 9 } })
		expect(store.put).toHaveBeenCalledWith(key, built)
		expect(phases).toEqual(['file', 'cache', 'build'])
		const b = await vaultBuild(s, R, { stage: '9' }, { box, store })
		expect(b.from).toBe('cache')
		expect(box.build).toHaveBeenCalledTimes(1)
		expect(s.recipeAt).toHaveBeenCalledTimes(2)
	})

	it('drops a spoiled entry and builds anew; keeps nothing when told not to', async () => {
		const key = cache.keyOf({ engine: LATEST.blake3, recipe: R, params: { seed: 'maia', stage: 3 } })
		await store.put(key, { data: {}, card: { fits: false } })
		const a = await vaultBuild(source(), R, {}, { box, store })
		expect(store.drop).toHaveBeenCalledWith(key)
		expect(a.from).toBe('box')
		const c = await vaultBuild(source(), R, {}, { box, store: { get: vi.fn(), put: vi.fn(), drop: vi.fn() }, keep: false })
		expect(await c.stored).toBe(false)
	})

	it('says why it could not', async () => {
		await expect(vaultBuild(source(), 'd'.repeat(64), {}, { box, store })).rejects.toThrow(/is in the Maia City vault/)
		await expect(vaultBuild(source([]), R_OF([]), { seed: 'x' }, { box, store })).rejects.toThrow('Fern v2 takes no parameters')
		await expect(vaultBuild(source(), R, { stage: '12' }, { box, store })).rejects.toThrow(/^Fern v2: /)
		box.build = vi.fn(async () => { throw new Error('timed out') })
		await expect(vaultBuild(source(), R, {}, { box, store })).rejects.toThrow('Fern v2: the box could not build it (timed out)')
		box.build = vi.fn(async () => ({ data: {}, card: { fits: false } }))
		await expect(vaultBuild(source(), R, {}, { box, store })).rejects.toThrow('Fern v2: refused, its card does not fit: no fit')
		box.build = vi.fn(async () => ({ data: {}, card: { fits: true, recipe: 'e'.repeat(64) } }))
		await expect(vaultBuild(source(), R, {}, { box, store })).rejects.toThrow('Fern v2: refused, its card names another recipe')
	})
})
