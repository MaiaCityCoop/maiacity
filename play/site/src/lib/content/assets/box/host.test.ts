import { describe, expect, it } from 'vitest'
import { AssetBox } from './host.js'
import { budget, buildTurn } from '$lib/content/render/budget.js'

/** a box whose jobs the test answers by hand: each job asked waits until it is let go */
function handBox() {
	const box = new AssetBox()
	const open: { op: string; done: (v: unknown) => void }[] = []
	// the shell's ask, answered by the test
	;(box as unknown as { ask: (op: string) => Promise<unknown> }).ask = (op: string) => new Promise((done) => open.push({ op, done }))
	return { box, open }
}
const recipe = { hash: 'h', code: 'c' }
// (a shell's stop takes its message listener off the window: none here)
globalThis.removeEventListener ??= () => {}
const tick = () => new Promise((ok) => setTimeout(ok, 5))

describe('the asset box under the device budget', () => {
	it('takes one of the page turns only for the build it runs, not for those waiting behind it in the same box', async () => {
		const { box, open } = handBox()
		const builds = [box.build(recipe, {}, {}), box.build(recipe, {}, {}), box.build(recipe, {}, {})]
		await tick()
		// one job asked of the box at a time
		expect(open.length).toBe(1)
		// so every other turn of the page is still free: another box builds at once
		const others: (() => void)[] = []
		for (let i = 0; i < budget().builds - 1; i++) others.push(await buildTurn())
		for (const back of others) back()
		open[0]!.done({ data: 1 })
		await tick()
		expect(open.length).toBe(2)
		open[1]!.done({ data: 2 })
		await tick()
		open[2]!.done({ data: 3 })
		expect(await Promise.all(builds)).toEqual([{ data: 1 }, { data: 2 }, { data: 3 }])
	})

	it('does not run a build asked before its owner stopped it, and gives its turn back', async () => {
		const { box, open } = handBox()
		const first = box.build(recipe, {}, {})
		const second = box.build(recipe, {}, {})
		await tick()
		expect(open.length).toBe(1)
		box.stop('the renderer was disposed')
		open[0]!.done({ data: 1 })
		await first
		await expect(second).rejects.toThrow('the renderer was disposed')
		expect(open.length).toBe(1)
		// every turn is back: as many as the budget lets go at once are had again at once
		const backs: (() => void)[] = []
		for (let i = 0; i < budget().builds; i++) backs.push(await buildTurn())
		for (const back of backs) back()
	})
})
