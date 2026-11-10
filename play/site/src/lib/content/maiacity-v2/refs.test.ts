// Sandbox 3 names its things and plants by their slots of its pins (play/SPEC.md §4.6), as catalog.js writes them.
import { expect, it } from 'vitest'
// @ts-ignore — plain JS
import { THINGS } from './things.js'
// @ts-ignore — plain JS
import { plantRef } from './plants.js'

it('names a thing and a plant by its slot', () => {
	expect(THINGS.pickup).toBe('pin:a2af9568-53c6-8917-a816-da88d3ff66ff/pickup')
	expect(plantRef({ id: 'apple' }, 7, 'a b')).toBe('pin:a2af9568-53c6-8917-a816-da88d3ff66ff/plant-apple?stage=7&seed=a%20b')
})
