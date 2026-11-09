import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createPlantings } from './plantings.js'

// The asset viewer disposes its plantings each time it shows another asset (VaultAsset.svelte): a throw there broke
// every other asset picked in one page, "No recipe of this version is in the catalog." or a blank stage (intent e5ddf0b2).
describe('plantings', () => {
	it('dispose, and dispose again, throws nothing, whether anything was planted or not', () => {
		const scene = new THREE.Scene()
		const p = createPlantings({ renderer: {} as THREE.WebGLRenderer, camera: new THREE.PerspectiveCamera(), scene })
		p.clear()
		expect(() => p.dispose()).not.toThrow()
		expect(() => p.dispose()).not.toThrow()
		expect(p.guests()).toEqual([])
	})
})
