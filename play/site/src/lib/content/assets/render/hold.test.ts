/*
 * What a kind keeps in the page (./hold.js, intent 1893a631): its full build goes once its lighter levels stand and the
 * device's cache keeps it, and is asked for again when a copy wants it.
 */
import { describe, expect, it } from 'vitest'
import { FULL_AFTER, LET_GO, ahead, derived, letGoAfter, mayLetGo } from './hold.js'

const level = (o: Record<string, unknown> = {}) => ({ state: 'ready', name: null as string | null, kept: false, obj: null as unknown, as: -1, meshes: [{}] as unknown[] | null, level: {}, ...o })
/** a kind whose levels are derived: its one build (L0, the base), and two levels made from it */
const tree = (base: Record<string, unknown> = {}, lower: Record<string, unknown>[] = [{}, {}]) => ({ names: ['walnut?stage=9'], base: 0, picture: true, slot: {}, levels: [level({ name: 'walnut?stage=9', kept: true, ...base }), ...lower.map((o) => level(o))] })
/** a kind that declares its levels: three builds, the coarsest its base */
const declared = () => ({ names: ['a?detail=1', 'a?detail=0.25', 'a?detail=0.1'], base: 2, picture: true, slot: {}, levels: [0, 1, 2].map((i) => level({ name: `a${i}`, kept: true })) })

describe("a kind's full build is kept only while a copy stands near it", () => {
	it('a kind whose levels are derived lets its full build go once its lower levels stand and the cache keeps it', () => {
		const k = tree()
		expect(derived(k)).toBe(true)
		expect(mayLetGo(k, 0)).toBe(true)
		// on every device, after the same wait; its other levels by the device's budget (never, on a desktop)
		expect(letGoAfter(k, 0, 0)).toBe(FULL_AFTER)
		expect(letGoAfter(k, 0, 15000)).toBe(FULL_AFTER)
		expect(letGoAfter(k, 1, 0)).toBe(0)
		expect(letGoAfter(k, 1, 15000)).toBe(15000)
	})

	it('it stays while its lower levels are still being made, while one is drawn as it, or before its picture is taken', () => {
		expect(mayLetGo(tree({}, [{ state: 'loading' }, {}]), 0)).toBe(false)
		expect(mayLetGo(tree({}, [{}, { state: 'failed' }]), 0)).toBe(false)
		expect(mayLetGo(tree({}, [{ as: 0, meshes: [] }, {}]), 0)).toBe(false)
		expect(mayLetGo({ ...tree(), slot: null }, 0)).toBe(false)
		// a kind no picture is taken of waits for none
		expect(mayLetGo({ ...tree(), slot: null, picture: false }, 0)).toBe(true)
	})

	it('it stays while the cache does not keep it, or while it is kept whole for its controls', () => {
		expect(mayLetGo(tree({ kept: false }), 0)).toBe(false)
		expect(mayLetGo(tree({ obj: {} }), 0)).toBe(false)
		expect(mayLetGo(tree({ meshes: [] }), 0)).toBe(false)
	})

	it("a recipe's own coarsest level stays: it is the light one every far copy is drawn at", () => {
		const k = declared()
		expect(derived(k)).toBe(false)
		expect(mayLetGo(k, 2)).toBe(false)
		expect(letGoAfter(k, 2, 15000)).toBe(0)
		// its finer builds go as before, where the cache keeps them
		expect(mayLetGo(k, 0)).toBe(true)
		k.levels[0].kept = false
		expect(mayLetGo(k, 0)).toBe(false)
	})

	it('let go of, it holds nothing and is asked for again by its build, which the cache hands back', () => {
		const k = tree()
		const lv = k.levels[0]
		Object.assign(lv, LET_GO)
		// nothing of it is held, its name stays: the renderer's `want` asks for an idle level by its name, and a build is
		// read from the device's cache before any box is asked (../load.js `loadAsset`)
		expect(lv).toMatchObject({ state: 'idle', level: null, meshes: null, name: 'walnut?stage=9' })
		expect(mayLetGo(k, 0)).toBe(false)
		// while it is away its lighter levels are let go of only as before, never for want of it
		expect(mayLetGo(k, 1)).toBe(true)
	})

	it('it is never swapped for a lighter shape before your eyes: kept while a copy stands a band away, and asked back from there', () => {
		const now = 100_000
		// a copy drawn at the level next to it lately: it stays
		const near = tree({}, [{ seen: now - 1_000 }, {}])
		expect(mayLetGo(near, 0, now)).toBe(false)
		// no copy there for longer than the wait: it may go
		const far = tree({}, [{ seen: now - FULL_AFTER - 1 }, {}])
		expect(mayLetGo(far, 0, now)).toBe(true)
		// gone, a copy drawn at the next level asks it back at once, before it is wanted itself
		Object.assign(far.levels[0], LET_GO)
		expect(ahead(far, 1)).toBe(0)
		// a copy farther out does not, nor one while it is here or on its way
		expect(ahead(far, 2)).toBe(-1)
		far.levels[0].state = 'loading'
		expect(ahead(far, 1)).toBe(-1)
		expect(ahead(tree(), 1)).toBe(-1)
		// a recipe's own levels are built each from the recipe: nothing is asked ahead
		const k = declared()
		Object.assign(k.levels[0], LET_GO)
		expect(ahead(k, 1)).toBe(-1)
	})
})
