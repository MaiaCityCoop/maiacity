// What a world's last loading step waits for (./drawn.js `settled`, intent 7a6c3f1b): what is being built for it, never
// the lower levels being made lighter beside the page, which come long after (a kind is drawn as its build until then).
import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'

const busy = { queue: 0, loads: 0, compiling: 0, lowering: 0 }
vi.mock('$lib/content/assets/render/index.js', () => ({
	createAssets: () => ({ group: new THREE.Group(), stats: () => ({ busy, building: busy.queue + busy.loads + busy.compiling + busy.lowering }) })
}))

describe('a world drawn by the renderer', () => {
	it('is settled once nothing is read, built or compiled for it, whatever levels are still being made lighter', async () => {
		// @ts-ignore — plain JS
		const { createDrawn } = await import('./drawn.js')
		const drawn = createDrawn({ renderer: {}, camera: new THREE.PerspectiveCamera(), scene: new THREE.Scene() })
		expect(drawn.settled()).toBe(true)
		for (const k of ['queue', 'loads', 'compiling'] as const) {
			busy[k] = 1
			expect(drawn.settled()).toBe(false)
			busy[k] = 0
		}
		// twelve big trees' levels in the making: the world does not wait for them
		busy.lowering = 12
		expect(drawn.settled()).toBe(true)
	})
})
