// The Factories name their pallet by its slot of their pins (play/SPEC.md §4.6), as catalog.js writes it.
import { expect, it } from 'vitest'
// @ts-ignore — plain JS
import { PALLET } from './pallet.js'

it('names the pallet by its slot', () => expect(PALLET).toBe('pin:9862777e-04c2-8362-b028-27ff7e0591b8/pallet'))
