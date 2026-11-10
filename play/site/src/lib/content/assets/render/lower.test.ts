/*
 * The renderer's maker of lower levels works on every core the page has to spare (./lower.js, intent 08d00b84): the
 * levels of N kinds are made in min(N, the budget's builds) workers at once, on the turns the recipes' builds take too,
 * and a level made in a worker is the level the page would make alone. Stand-in workers the test answers by hand, or
 * that simplify in place: no clock, no thread.
 */
import { afterEach, describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createLowering } from './lower.js'
import { lowerDraws } from './simplify.js'
import { prepare } from './prepare.js'
import { budgetOf, errorOf, smallestOf } from './lod.js'
import { budget } from '$lib/content/render/budget.js'
import { turn } from '$lib/content/render/turns.js'

type Fake = { onmessage: ((e: { data: unknown }) => void) | null; asked: { draws: unknown[]; plans: unknown[] } | null; ended: boolean }
/** workers standing in for the simplifying worker: each job waits until the test answers it, or is made at once (`real`) */
function fakeWorkers(real = false) {
	const made: Fake[] = []
	;(globalThis as any).Worker = class {
		onmessage: Fake['onmessage'] = null
		asked: Fake['asked'] = null
		ended = false
		constructor() {
			made.push(this)
		}
		postMessage(m: { draws: unknown[]; plans: unknown[] }) {
			this.asked = m
			if (real) lowerDraws(m.draws, m.plans).then((out: unknown) => ((this.asked = null), this.onmessage?.({ data: { out } })))
		}
		terminate() {
			this.ended = true
		}
	}
	const open = () => made.filter((w) => w.asked)
	const answer = (w: Fake, out: unknown) => ((w.asked = null), w.onmessage?.({ data: { out } }))
	return { made, open, answer }
}
const settled = async () => {
	for (let i = 0; i < 200; i++) await Promise.resolve()
}
afterEach(() => void delete (globalThis as any).Worker)

/** a build's level as the renderer prepares it: a dense ball on a stem */
function built(seed = 0) {
	const root = new THREE.Group()
	const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5 + seed * 0.1, 48, 32), new THREE.MeshStandardMaterial({ color: 0x6a8f3a }))
	ball.position.y = 1.2
	const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1, 16, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }))
	stem.position.y = 0.5
	root.add(ball, stem)
	return prepare(root, { of: (m: THREE.Material) => m })
}
const plansOf = (from: any) => [1, 2].map((L) => ({ budget: budgetOf(L, from.tris), most: budgetOf(L, Infinity), error: errorOf(L, from.radius), smallest: smallestOf(L, from.radius) }))

describe("a world's lower levels are made on every core but one", () => {
	it('the levels of N kinds are made in min(N, builds) workers at once, the next as each comes free', async () => {
		const turns = budget().builds
		expect(turns).toBeGreaterThan(1)
		const w = fakeWorkers()
		const lowering = createLowering()
		const n = turns + 3
		const made = Array.from({ length: n }, (_, i) => lowering.lower({ draws: [] } as any, [], false, true).then((out: unknown) => [i, out]))
		await settled()
		expect(w.open().length).toBe(turns)
		expect(w.made.length).toBe(turns)
		expect(lowering.busy).toBe(n)
		for (let left = n; left > 0; left--) {
			expect(w.open().length).toBe(Math.min(left, turns))
			w.answer(w.open()[0]!, `made`)
			await settled()
		}
		// never a worker more than the turns, however many kinds waited
		expect(w.made.length).toBe(turns)
		expect((await Promise.all(made)).length).toBe(n)
		expect(lowering.busy).toBe(0)
		lowering.dispose()
		expect(w.made.every((x) => x.ended)).toBe(true)
	})

	it("levels and recipes' builds share the page's turns: together never more at once than the budget's builds", async () => {
		const turns = budget().builds
		// two recipes are being built (each holds a turn, as ../box/host.js takes one for a build)
		const builds = [await turn(), await turn()]
		const w = fakeWorkers()
		const lowering = createLowering()
		for (let i = 0; i < turns + 2; i++) void lowering.lower({ draws: [] } as any, [], false, true)
		await settled()
		expect(w.open().length).toBe(turns - 2)
		// a build done: its turn is a level's
		builds[0]!()
		await settled()
		expect(w.open().length).toBe(turns - 1)
		builds[1]!()
		await settled()
		expect(w.open().length).toBe(turns)
		for (const x of w.open()) w.answer(x, 'made')
		await settled()
		for (const x of w.open()) w.answer(x, 'made')
		await settled()
		lowering.dispose()
	})

	it('the most wanted waiting is made first, chosen as its turn comes; what can wait, after all others', async () => {
		const turns = budget().builds
		const held = await Promise.all(Array.from({ length: turns - 1 }, () => turn()))
		const w = fakeWorkers()
		const lowering = createLowering()
		const order: string[] = []
		const ask = (name: string, rank: number, later = false) => void lowering.lower({ draws: [], name } as any, [name] as any, later, true, () => rank).then(() => order.push(name))
		ask('far', 1), ask('lighter', 9, true), ask('near', 5), ask('mid', 3)
		await settled()
		for (let i = 0; i < 4; i++) {
			expect(w.open().length).toBe(1)
			w.answer(w.open()[0]!, 'made')
			await settled()
		}
		expect(order).toEqual(['near', 'mid', 'far', 'lighter'])
		for (const back of held) back()
		lowering.dispose()
	})

	it('levels made side by side in workers are the levels the page makes alone, one after another', async () => {
		const sources = [0, 1, 2, 3, 4].map(built)
		const alone = createLowering({ worker: false })
		const one: any[] = []
		for (const s of sources) one.push(await alone.lower(s, plansOf(s), false, true))
		fakeWorkers(true)
		const lowering = createLowering()
		const many = await Promise.all(sources.map((s) => lowering.lower(s, plansOf(s), false, true)))
		expect(many).toEqual(one)
		// and something was made lighter at all
		expect(one[0][1].draws.some((d: any) => d && d !== 'same' && d.index)).toBe(true)
		lowering.dispose()
	})
})
