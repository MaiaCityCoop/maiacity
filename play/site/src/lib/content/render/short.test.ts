/*
 * Short of memory, said (./short.js, intent 1893a631): a world's load leaves a note; a load that finds it opens
 * lighter and says so; twice in a row it says so and loads nothing by itself.
 */
import { describe, expect, it } from 'vitest'
import { LIGHTER, STOPPED, begin, end } from './short.js'

function tab() {
	const kept = new Map<string, string>()
	return { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k), kept }
}

describe('a world that was ended for want of memory says so', () => {
	it('a first load is as ever, and leaves its note; settled or left, the note is gone', () => {
		const s = tab()
		expect(begin('/sandbox-1/', s)).toEqual({ ended: 0, lighter: false, stop: false, message: '' })
		expect(s.kept.size).toBe(1)
		end(s)
		expect(s.kept.size).toBe(0)
		// a visit that settled starts clean
		expect(begin('/sandbox-1/', s)).toMatchObject({ ended: 0, lighter: false, stop: false })
	})

	it('a load that finds the note was ended: it opens lighter and says so', () => {
		const s = tab()
		begin('/sandbox-1/', s)
		// (the page is ended: no pagehide, nothing clears the note)
		expect(begin('/sandbox-1/', s)).toEqual({ ended: 1, lighter: true, stop: false, message: LIGHTER })
		end(s)
		expect(begin('/sandbox-1/', s)).toMatchObject({ ended: 0, lighter: false })
	})

	it('ended twice in a row, it says so and loads no world by itself; the reload a person asks for tries once more, lighter', () => {
		const s = tab()
		begin('/sandbox-1/', s)
		begin('/sandbox-1/', s)
		expect(begin('/sandbox-1/', s)).toEqual({ ended: 2, lighter: true, stop: true, message: STOPPED })
		// nothing loads now, so nothing ends it: the same page again is the person's own reload
		expect(begin('/sandbox-1/', s)).toEqual({ ended: 1, lighter: true, stop: false, message: LIGHTER })
		// and ended again, it stops again: never a loop
		expect(begin('/sandbox-1/', s)).toMatchObject({ ended: 2, stop: true })
	})

	it("another world's note is not this one's, and a tab without storage notes nothing", () => {
		const s = tab()
		begin('/sandbox-1/', s)
		expect(begin('/sandbox-5/', s)).toMatchObject({ ended: 0, lighter: false, stop: false })
		expect(begin('/sandbox-5/', null)).toMatchObject({ ended: 0, lighter: false, stop: false })
		s.setItem('play.world.loading', '{not json')
		expect(begin('/sandbox-5/', s)).toMatchObject({ ended: 0 })
		const closed = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') }, removeItem: () => { throw new Error('denied') } }
		expect(begin('/sandbox-5/', closed)).toMatchObject({ ended: 0, stop: false })
		expect(() => end(closed)).not.toThrow()
	})
})
