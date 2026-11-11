/*
 * The page's one line of turns (./turns.js, intent 7a6c3f1b): never more at work than the device's budget, the most
 * wanted first, and a build before a level, so a plant waiting to be built is never held behind a shape being made
 * lighter. No clock, no worker: the test gives each turn back by hand.
 */
import { describe, expect, it } from 'vitest'
import { lineOf, turn } from './turns.js'
import { budget } from './budget.js'

const settled = async () => {
	for (let i = 0; i < 20; i++) await Promise.resolve()
}
/** a line of `most` turns, each asker named: who works now (`open`), and its turn given back by name */
function hand(most: number) {
	const line = lineOf(() => most)
	const open = new Map<string, () => void>()
	const order: string[] = []
	const ask = (name: string, o: Parameters<typeof line>[0] = {}) => void line(o).then((back) => (open.set(name, back), order.push(name)))
	const done = (name: string) => (open.get(name)!(), open.delete(name))
	return { line, open, order, ask, done }
}

describe("the page's turns", () => {
	it("never more at work than the budget's builds, the next as soon as one is done; a turn given back twice counts once", async () => {
		const most = budget().builds
		const backs: (() => void)[] = []
		for (let i = 0; i < most; i++) backs.push(await turn())
		let next = false
		const waiting = turn().then((back) => ((next = true), back))
		await settled()
		expect(next).toBe(false)
		expect(turn.waiting()).toBe(1)
		backs[0]!()
		backs[0]!()
		const back = await waiting
		expect(turn.waiting()).toBe(0)
		// (given back twice, it freed one turn, not two)
		let extra = false
		const one = turn().then((b) => ((extra = true), b))
		await settled()
		expect(extra).toBe(false)
		back()
		;(await one)()
		for (const b of backs.slice(1)) b()
		;(await turn())()
	})

	it('a build before a level: every free turn goes to a waiting build first, and a level is begun only when no build waits', async () => {
		const h = hand(2)
		// the levels are asked first, as the level maker always stands in the line
		h.ask('level a', { level: true, rank: 9 })
		h.ask('level b', { level: true, rank: 9 })
		for (let i = 0; i < 5; i++) h.ask(`build ${i}`, { rank: 0 })
		await settled()
		expect([...h.open.keys()]).toEqual(['build 0', 'build 1'])
		// each turn a build gives back goes to the next build, never to a level, however much that level is wanted
		for (let i = 0; i < 3; i++) {
			h.done(`build ${i}`)
			await settled()
			expect([...h.open.keys()]).toEqual([`build ${i + 1}`, `build ${i + 2}`])
		}
		// no build waits any more: now the levels, on the turns the builds give back
		h.done('build 3')
		await settled()
		expect([...h.open.keys()]).toEqual(['build 4', 'level a'])
		// a build asked while a level works takes the next free turn before the level that waits
		h.ask('build late')
		h.done('build 4')
		await settled()
		expect([...h.open.keys()]).toEqual(['level a', 'build late'])
		h.done('build late')
		await settled()
		expect([...h.open.keys()]).toEqual(['level a', 'level b'])
		expect(h.order.filter((n) => n.startsWith('level'))).toEqual(['level a', 'level b'])
	})

	it('among builds the most wanted first, asked again as each turn comes free; alike, the first asked', async () => {
		const h = hand(1)
		const near: Record<string, number> = { a: 0, b: 0, c: 1, d: 5, e: 5 }
		for (const k of Object.keys(near)) h.ask(k, { rank: () => near[k]! })
		await settled()
		// (of all asked together the most wanted, not the first asked)
		expect([...h.open.keys()]).toEqual(['d'])
		// what is wanted changed while it waited (the eye moved)
		near.b = 9
		for (const next of ['b', 'e', 'c', 'a']) {
			h.done([...h.open.keys()][0]!)
			await settled()
			expect([...h.open.keys()]).toEqual([next])
		}
	})

	it('among levels the most wanted first; one that can wait (made lighter later) after all the others', async () => {
		const h = hand(1)
		h.ask('far', { level: true, rank: () => 1 })
		h.ask('lighter', { level: true, rank: -Infinity })
		h.ask('near', { level: true, rank: () => 5 })
		h.ask('unranked', { level: true })
		await settled()
		for (let i = 0; i < 3; i++) h.done([...h.open.keys()][0]!), await settled()
		expect(h.order).toEqual(['near', 'far', 'unranked', 'lighter'])
	})
})
