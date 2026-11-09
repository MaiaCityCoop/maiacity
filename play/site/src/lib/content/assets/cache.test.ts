// The device's cache keeps builds under keys and in a file format that stay valid across visits: a key or a byte of the
// format that moved would leave every device's entries unread (or, worse, read as another build).
import { describe, expect, it } from 'vitest'
// @ts-ignore — plain JS
import * as cache from './cache.js'
// @ts-ignore — plain JS
import { hashBytes } from '../../kernel/hash.js'

const H = 'a'.repeat(64), R = 'b'.repeat(64)

describe("the device's cache", () => {
	it('keys a build by its engine, recipe and values, and a level by its build, level, plan and maker', () => {
		expect(cache.keyOf({ engine: H, recipe: R, params: { stage: 9, seed: 'maia' } })).toBe('882b4cb5db9d7aa9220ae3accdc78f28c92001373edfcac55ca778915e6cffe8')
		expect(cache.keyOf({ engine: H, recipe: R })).toBe('3b51eb93d59f5295396503aabcb546f4c6646b0d4b5e437b4b7101ad3b091d94')
		expect(() => cache.keyOf({ engine: 'v5', recipe: R })).toThrow('no engine hash')
		expect(cache.levelKeyOf({ build: `${R}?seed=maia`, level: 2, plan: { budget: 1000 }, deriver: 3 })).toBe('90b60451bfbe102467e74a69a51cebebde8e6c45e2837200d9ac46ac09c5c089')
		expect(cache.levelKeyOf({ build: R, level: 'picture', deriver: 1 })).toBe('80714a94fa2b1cfd89c510441cac0ef66b5a19ca6eed2f79078db3fb26e460ad')
		expect(() => cache.levelKeyOf({ build: 'plants/fern', level: 1, deriver: 1 })).toThrow('no build')
	})

	it('writes an entry as the same bytes and reads back what it kept', () => {
		const v: any = { a: new Float32Array([1, 2, 3]), b: [NaN, -0, Infinity, undefined, null, 'x', true], c: { '\u0000': 1, d: new Uint16Array([7]) }, e: new ArrayBuffer(3) }
		v.f = v.a
		const file = cache.packed(v)
		expect(hashBytes(file)).toBe('2934922d3da69c788b9630333abe52174a135f8b782e9493903c5968dcfef795')
		const back = cache.unpacked(file)
		expect([...back.a]).toEqual([1, 2, 3])
		expect(back.f).toBe(back.a)
		expect(Object.is(back.b[1], -0)).toBe(true)
		expect(back.c['\u0000']).toBe(1)
		expect(() => cache.unpacked(file.slice(0, file.length - 1))).toThrow('refused')
	})

	it('keeps and finds nothing where the browser has no folder for it', async () => {
		expect(await cache.get(H)).toBeUndefined()
		expect(await cache.fileAt(H)).toBeUndefined()
		expect(await cache.getLevel(H)).toBeUndefined()
		expect(await cache.keepFile(H, new Uint8Array(1))).toBe(false)
	})
})
