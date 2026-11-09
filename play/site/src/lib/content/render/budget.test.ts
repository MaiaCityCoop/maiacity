import { describe, expect, it } from 'vitest'
import { budget, budgetFor, buildTurn, smallDevice } from './budget.js'

describe('the device budget', () => {
	it('holds a small device to a few builds, one box and one room a renderer, a 2048 shadow map and its corners let go', () => {
		const s = budgetFor(true, 6)
		expect(s).toMatchObject({ small: true, builds: 2, boxes: 1, rooms: 1, spare: false, shadowMap: 2048, release: true })
		expect(s.picture).toEqual({ px: 40, page: 1280, views: 6 })
		expect(s.evict).toBeGreaterThan(0)
	})

	it('leaves a desktop as it was, its builds at once by its cores', () => {
		const d = budgetFor(false, 10)
		expect(d).toMatchObject({ small: false, builds: 8, rooms: 4, spare: true, shadowMap: 4096, release: false, evict: 0 })
		expect(budgetFor(false, 2).builds).toBe(2)
	})

	it('lets only as many builds go at once as the budget says, the next as soon as one is done', async () => {
		const most = budget().builds
		const backs: (() => void)[] = []
		for (let i = 0; i < most; i++) backs.push(await buildTurn())
		let next = false
		const waiting = buildTurn().then((back) => {
			next = true
			return back
		})
		await new Promise((ok) => setTimeout(ok, 10))
		expect(next).toBe(false)
		backs[0]!()
		// a turn given back twice counts once
		backs[0]!()
		const back = await waiting
		expect(next).toBe(true)
		back()
		for (const b of backs.slice(1)) b()
		// all given back: a new turn comes at once
		const again = await buildTurn()
		again()
	})

	it('takes every iPhone and iPad, and a small touch screen, for a small device, but not a desktop that says it has 4 cores', () => {
		const was = { window: globalThis.window, navigator: globalThis.navigator }
		const as = (ua: string, o: { touch?: number; coarse?: boolean; screen?: [number, number]; memory?: number; cores?: number; search?: string } = {}) => {
			Object.defineProperty(globalThis, 'navigator', { value: { userAgent: ua, maxTouchPoints: o.touch ?? 0, deviceMemory: o.memory, hardwareConcurrency: o.cores ?? 8 }, configurable: true })
			Object.defineProperty(globalThis, 'window', {
				value: { location: { search: o.search ?? '' }, matchMedia: () => ({ matches: !!o.coarse }), screen: { width: o.screen?.[0] ?? 1920, height: o.screen?.[1] ?? 1080 } },
				configurable: true
			})
			return smallDevice()
		}
		try {
			expect(as('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', { touch: 5, coarse: true, screen: [393, 852] })).toBe(true)
			// an iPad on iPadOS says it is a Mac, but has a touch screen
			expect(as('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', { touch: 5, coarse: true, screen: [1032, 1376] })).toBe(true)
			expect(as('Mozilla/5.0 (Linux; Android 14; Pixel 8)', { touch: 5, coarse: true, screen: [412, 915] })).toBe(true)
			// a Mac with Safari's 4 cores and no touch screen is no small device; one that says it has 4 GB is
			expect(as('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', { cores: 4 })).toBe(false)
			expect(as('Mozilla/5.0 (X11; Linux x86_64)', { memory: 4 })).toBe(true)
			// and the page's address decides where it says so
			expect(as('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', { touch: 5, search: '?budget=full' })).toBe(false)
			expect(as('Mozilla/5.0 (X11; Linux x86_64)', { search: '?budget=small' })).toBe(true)
		} finally {
			Object.defineProperty(globalThis, 'window', { value: was.window, configurable: true })
			Object.defineProperty(globalThis, 'navigator', { value: was.navigator, configurable: true })
		}
	})
})
