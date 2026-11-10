// The garden names each plant by its build, its stage and seed after the build's own values; a plant that does not
// grow is a counted failure (intent 4a199916).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createForest, didNotGrow, refOf, NEAR, type FloraDrawn } from './flora.js'
import WORLDS from './flora.worlds.json'

const R = 'f'.repeat(64)
it('names a planting by its build, stage and seed', () => {
	expect(refOf({ id: 'x', v: 1, asset: `${R}?v=1`, stage: 3, seed: 's/1' })).toBe(`${R}?v=1&stage=3&seed=s%2F1`)
	expect(refOf({ id: 'x', v: 1, asset: R, stage: 3, seed: 's' })).toBe(`${R}?stage=3&seed=s`)
})

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

/**
 * A device's storage as the asset cache uses it (OPFS: one folder of files read and written whole, listed, removed, and
 * what the browser gives the site), kept between visits. Each file weighs `weigh` times its bytes, as a world's builds
 * really do (megabytes each), without the test holding them.
 */
function deviceOf(quota: number, weigh: number) {
	const files = new Map<string, { bytes: Uint8Array; at: number }>()
	let clock = 0
	const missing = (name: string) => Object.assign(new Error(`${name}: not found`), { name: 'NotFoundError' })
	const handle = (name: string) => ({
		kind: 'file' as const,
		getFile: async () => {
			const f = files.get(name)
			if (!f) throw missing(name)
			return { size: f.bytes.byteLength * weigh, lastModified: f.at, arrayBuffer: async () => f.bytes.slice().buffer }
		},
		createWritable: async () => {
			const parts: Uint8Array[] = []
			return { write: async (b: Uint8Array) => void parts.push(b.slice()), close: async () => void files.set(name, { bytes: parts[0] ?? new Uint8Array(0), at: ++clock }), abort: async () => {} }
		}
	})
	const folder = {
		getFileHandle: async (name: string, o?: { create?: boolean }) => {
			if (!files.has(name) && !o?.create) throw missing(name)
			return handle(name)
		},
		removeEntry: async (name: string) => {
			if (!files.delete(name)) throw missing(name)
		},
		entries: async function* () {
			for (const name of [...files.keys()]) yield [name, handle(name)] as const
		}
	}
	return { files, storage: { getDirectory: async () => ({ getDirectoryHandle: async () => folder }), estimate: async () => ({ quota }) } }
}

describe('flora: a world visited again', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.resetModules()
	})

	const ENGINE = 'e'.repeat(64)
	/** a plant's recipe by its hash: `n` names the plant, `v` its version */
	const planted = (n: number, v = 1) => ({ id: `plant-${n}`, v, asset: `${n.toString(16).padStart(8, '0')}${v.toString(16).padStart(8, '0')}`.padEnd(64, 'a'), stage: 9, seed: 'sandbox-5' })

	/**
	 * One visit: the page opened anew on the device (its modules fresh, its storage as the last visit left it), the
	 * world's forest grown from `kinds`, each kind got as the loader gets a build (../../assets/load.js): from the
	 * device's cache by its recipe's hash and values, else built and kept. Gives what was built and what was read back.
	 */
	async function visit(kinds: ReturnType<typeof planted>[]) {
		vi.resetModules()
		const { createForest } = await import('./flora.js')
		// @ts-ignore — plain JS
		const cache = await import('../../assets/cache/builds.js')
		const built: string[] = [], read: string[] = []
		const flora: FloraDrawn = {
			use: (ref: string) => {
				const [recipe, query] = ref.split('?') as [string, string]
				const key = cache.keyOf({ engine: ENGINE, recipe, params: Object.fromEntries(new URLSearchParams(query)) })
				const ready = (async () => {
					const kept = await cache.get(key)
					if (kept?.data) return void read.push(recipe)
					built.push(recipe)
					// (a build's own data: its corners, a kilobyte of them here)
					void cache.put(key, { data: { positions: new Float32Array(256).fill(built.length) }, card: { recipe } })
				})()
				return { ready, base: 0, levels: [{ level: { draws: [] } }] }
			},
			take: () => ({}),
			give: () => {},
			far: () => 20,
			assets: { stats: () => ({ tris: 0 }) }
		}
		const forest = createForest({ flora })
		kinds.forEach((k, i) => forest.add(k, i % 3 ? 'cover' : 'tree', (i % 20) * 9, 0, Math.floor(i / 20) * 9, 0, 1))
		expect(await forest.grown(undefined, { x: 0, z: 0, dx: 0, dz: 1 })).toEqual([])
		expect(await forest.rest()).toEqual([])
		// the cache writes once builds stop coming in (its own wait, never the clock's: the timers are the test's)
		await vi.advanceTimersByTimeAsync(60_000)
		return { built, read }
	}

	it('second visit builds nothing: every kind is read back by its recipe\'s hash, and a new version builds only that one', async () => {
		vi.useFakeTimers()
		// a desktop's storage (the browser gives the site 20 GB); a world of 180 kinds, 5 MB a build: 0.9 GB, more than the
		// 512 MB the cache held on every device, which put out at each visit what the next one read first
		const device = deviceOf(20 * 1024 ** 3, 4096)
		vi.stubGlobal('navigator', { storage: device.storage, hardwareConcurrency: 8 })
		const world = Array.from({ length: 180 }, (_, i) => planted(i))

		const first = await visit(world)
		expect(first.built).toHaveLength(180)
		expect(first.read).toHaveLength(0)

		const second = await visit(world)
		expect(second.built).toEqual([])
		expect(second.read).toHaveLength(180)

		// one plant accepted at a new version: its recipe is another hash, and only it is built
		const upgraded = world.map((k, i) => (i === 7 ? planted(7, 2) : k))
		const third = await visit(upgraded)
		expect(third.built).toEqual([planted(7, 2).asset])
		expect(third.read).toHaveLength(179)

		// and what was kept for the others is still there after it was written
		const fourth = await visit(upgraded)
		expect(fourth.built).toEqual([])
		expect(fourth.read).toHaveLength(180)
	})
})

describe('flora: the world shows before the far kinds grow', () => {
	const REACH = { t: 'tree', s: 'shrub', c: 'cover' } as const
	/** a turn of the page's tasks: what was built is heard of */
	const turn = () => new Promise((ok) => setImmediate(ok))

	// each world as it stands when it opens (./flora.worlds.json, read from play's own Sandbox 1 and Sandbox 5): every
	// kind's nearest plant before the eye and its nearest one behind
	it.each(Object.entries(WORLDS.worlds))('%s: world shows before the far kinds grow, once only what stands near the start is built, and the rest are built nearest first', async (_world, stands) => {
		// the renderer's boxes as the forest sees them: a kind is built when the box takes it, the most wanted first
		// (its `rank`, ../../assets/render/index.js), one at a time
		const waiting: { n: number; rank: () => number; built: () => void }[] = []
		const flora: FloraDrawn = {
			use: (ref: string) => {
				const k: any = { base: 0, levels: [{ level: { draws: [] } }] }
				k.ready = new Promise<void>((ok) => waiting.push({ n: Number(ref.slice(0, 8)), rank: () => k.rank(), built: ok }))
				return k
			},
			take: () => ({}),
			give: () => {},
			far: () => 20,
			assets: { stats: () => ({ tris: 0 }) }
		}
		const forest = createForest({ flora })
		// the eye at 0, 0 looking along +z
		stands.forEach(([reach, ahead, behind], n) => {
			const k = { id: `plant-${n}`, v: 1, asset: String(n).padStart(8, '0').padEnd(64, 'a'), stage: 9, seed: 's' }
			if (ahead !== null) forest.add(k, REACH[reach as keyof typeof REACH], 0, 0, ahead as number, 0, 1)
			if (behind !== null) forest.add(k, REACH[reach as keyof typeof REACH], 0, 0, -(behind as number), 0, 1)
		})
		/** how far off a kind counts: its plant before the eye, or its one behind four times as far */
		const off = (n: number) => Math.min((stands[n]![1] as number | null) ?? Infinity, ((stands[n]![2] as number | null) ?? Infinity) * 4)
		const near = stands.flatMap(([reach], n) => (off(n) < NEAR[REACH[reach as keyof typeof REACH]] ? [n] : []))

		let shownAfter = -1
		const order: number[] = []
		const progress: [number, number][] = []
		void forest.grown((done, of) => progress.push([done, of]), { x: 0, z: 0, dx: 0, dz: 1 }).then(() => (shownAfter = order.length))
		await turn()
		expect(waiting).toHaveLength(stands.length)
		while (waiting.length) {
			const next = waiting.reduce((a, b) => (b.rank() > a.rank() ? b : a))
			waiting.splice(waiting.indexOf(next), 1)
			order.push(next.n)
			next.built()
			await turn()
		}
		await forest.rest()

		// shown as soon as the kinds near the start stood: those and no other, fewer than a third of the world's
		expect(shownAfter).toBe(near.length)
		expect(order.slice(0, shownAfter).sort((a, b) => a - b)).toEqual(near)
		expect(near.length).toBeGreaterThan(0)
		expect(near.length).toBeLessThan(stands.length / 3)
		expect(progress.at(-1)).toEqual([near.length, near.length])
		// and every other kind after it, the nearest first
		const rest = order.slice(shownAfter).map(off)
		expect(rest).toHaveLength(stands.length - near.length)
		expect(rest).toEqual([...rest].sort((a, b) => a - b))
		expect(forest.shape({ id: `plant-${order.at(-1)}`, v: 1, stage: 9, seed: 's' })).toBeDefined()
	})
})
