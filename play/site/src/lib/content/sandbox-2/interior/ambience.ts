/**
 * The sounds of the land: the forest, the stream, the hens, geese and goats, each nearer as you walk up to it, muffled
 * under a dome's glass. Each is a looping recording streamed (not decoded: the five-minute forest costs next to nothing
 * in memory) from the media library, play serving it in parts (Range) so a loop begun anywhere plays at once; Web Audio
 * eases its volume. Where the browser holds sound back, it starts with the first touch, click or key.
 */
import { asset } from '$lib/site/media/url'
import { playIfAllowed, resumeIfAllowed } from '$lib/kernel/media.js'

type SoundName = 'forest' | 'inside' | 'water' | 'hens' | 'geese' | 'goats' | 'frogs' | 'bees' | 'factory' | 'machine' | 'lift'
const FILES: Record<SoundName, string> = {
	forest: 'f3ebbb41045f0a45d3a27d6782beb71973fa539e9640d1c7d1b9434b02351575.mp3', // forest_nature.mp3
	inside: 'b6713600778441dab6c5232fa418af56a85209b17308e16975684fafd6bd3f84.mp3', // soft-nature.mp3
	water: '42cbca3f5c288272cc9e836a4a1f970c2edd14c4c95b282fc166bc0ff1f978d7.mp3', // water_stream.mp3
	hens: '4ffa6fe2e7cbc5082a78a3eabed4706afde5d6cb3eaa9af8ba5b05ab1d3d5da7.mp3', // chickens.mp3
	geese: '646b67cf337fdfdb3446e55b1f1edd4bfc3e6469bc12ea3acd07901cc71cda8f.mp3', // geese.mp3
	goats: 'ef0770d0d1b2927adbb95158dcf2a7c1a3abf74bf35f4aab4da3b2885374f25e.mp3', // sheep.mp3
	frogs: '1934113f408410383c16336a37d2e274579e0cc0802e574dcc232982cca02a84.mp3', // frog.mp3
	bees: '7605ffd5723a4511ba9320009d5e2beda3f9a734ad244d7765a6120bf4200e82.mp3', // bees.mp3
	factory: 'e36dbf3ef91c0502ad0ebafa4de32e4f03a4428c5082b1cb806fb4007c34acfa.mp3', // factory-ambience.mp3
	machine: '685b4be78584d58bce7d5a658046f047eddfef1f358acf7939ccac46c2db567e.mp3', // machine.mp3
	lift: '76059524fa9f0ac77bf2aab1738a344e3dd8526667502302f30637c007fb6be2.mp3' // lift.mp3
}
const LOUDEST: Record<SoundName, number> = { forest: 0.27, inside: 0.45, water: 0.69, hens: 0.5, geese: 0.45, goats: 0.4, frogs: 0.5, bees: 0.45, factory: 0.5, machine: 0.55, lift: 0.6 }
/** the recordings are not equally loud: this brings each to the same level (measured, mean ≈ −28 dB) */
const LEVEL: Partial<Record<SoundName, number>> = { goats: 22.1, frogs: 0.35, bees: 0.66, geese: 1.5, factory: 2.37, machine: 0.21, lift: 1.37 }

export type Ambience = {
	/** how near each sound is, 0 (silent) to 1 (right there), and whether you are under glass */
	set: (levels: Partial<Record<SoundName, number>>, indoors: boolean) => void
	dispose: () => void
}

/** Loudness from distance: full within `near` metres, fading to nothing at `far`. */
export const nearness = (d: number, near: number, far: number) => {
	const t = Math.max(0, Math.min(1, (far - d) / (far - near)))
	return t * t
}

export function ambience(): Ambience {
	let ctx: AudioContext | null = null
	let filter: BiquadFilterNode | null = null
	const tracks = new Map<SoundName, { el: HTMLAudioElement; gain: GainNode }>()
	let wanted: Partial<Record<SoundName, number>> = {}
	let underGlass = false
	let gone = false
	let asked = false

	/** the sounds made and loading, silent until they are wanted: at once, so they are ready when the world opens */
	const make = () => {
		if (ctx) return
		try {
			ctx = new AudioContext()
		} catch {
			return
		}
		filter = ctx.createBiquadFilter()
		filter.type = 'lowpass'
		filter.frequency.value = 20000
		filter.connect(ctx.destination)
		// the beds first (the forest outside, the soft nature inside): the ones heard the moment the world opens
		const order = (Object.keys(FILES) as SoundName[]).sort((a, b) => Number(!['forest', 'inside'].includes(a)) - Number(!['forest', 'inside'].includes(b)))
		for (const name of order) {
			const el = new Audio()
			el.loop = true
			el.preload = 'auto'
			el.crossOrigin = 'anonymous'
			const src = asset(FILES[name])
			if (src) el.src = src
			const gain = ctx.createGain()
			gain.gain.value = 0
			// the soft nature inside is heard in the room itself, not through the glass
			ctx.createMediaElementSource(el).connect(gain).connect(name === 'inside' || name === 'factory' || name === 'machine' || name === 'lift' ? ctx.destination : filter)
			// every loop starts somewhere else, so two visits never sound the same
			el.addEventListener('loadedmetadata', () => (el.currentTime = Math.random() * Math.max(0, el.duration - 1)), { once: true })
			tracks.set(name, { el, gain })
		}
		apply()
	}
	/** playing, if the browser lets it: true once the sound is on */
	const start = () => {
		if (gone) return false
		make()
		if (!ctx) return false
		if (ctx.state !== 'running') void resumeIfAllowed(ctx).then((on) => on && unlisten())
		for (const { el } of tracks.values()) if (el.paused) void playIfAllowed(el)
		if (ctx.state === 'running') unlisten()
		return ctx.state === 'running'
	}
	const apply = () => {
		if (!ctx || !filter) return
		const now = ctx.currentTime
		for (const [name, { el, gain }] of tracks) {
			const src = asset(FILES[name])
			if (src && el.getAttribute('src') !== src) { el.src = src; void playIfAllowed(el) }
			const v = (wanted[name] ?? 0) * LOUDEST[name] * (LEVEL[name] ?? 1) * (underGlass && !['forest', 'inside', 'factory', 'machine', 'lift'].includes(name) ? 0.5 : 1)
			// a slow glide, so nothing ever switches on or off
			gain.gain.setTargetAtTime(v, now, 0.6)
		}
		filter.frequency.setTargetAtTime(underGlass ? 900 : 20000, now, 0.5)
	}
	// where the browser holds the sound back, the first touch, click or key lets it play
	const GESTURES = ['pointerdown', 'touchend', 'keydown'] as const
	const gesture = () => void start()
	const unlisten = () => {
		for (const g of GESTURES) window.removeEventListener(g, gesture)
	}
	for (const g of GESTURES) window.addEventListener(g, gesture)
	make()

	return {
		set: (levels, indoors) => {
			wanted = levels
			underGlass = indoors
			// the world asks for its sounds once it is open: they play from then on (where the browser holds them back,
			// from the first touch, click or key)
			if (!asked) {
				asked = true
				start()
			}
			// a dev hook: what is playing, and how loud
			;(window as unknown as { __ambience?: unknown }).__ambience = { levels, indoors, started: ctx?.state === 'running', state: ctx?.state }
			apply()
		},
		dispose: () => {
			gone = true
			unlisten()
			for (const { el } of tracks.values()) {
				el.pause()
				el.removeAttribute('src')
				el.load()
			}
			void ctx?.close()
			ctx = null
		}
	}
}

type Where = () => { x: number; z: number }[]
/** The sounds a walker at (x, z) should hear: the forest outside, and how near the water and each herd are. */
export function levelsAt(x: number, z: number, indoors: boolean, water: { x: number; z: number }[], herds: Partial<Record<'hens' | 'geese' | 'goats' | 'frogs' | 'bees', Where>>) {
	const nearest = (pts: { x: number; z: number }[]) => {
		let best = Infinity
		for (const p of pts) {
			const dx = p.x - x, dz = p.z - z
			if (Math.abs(dx) < best && Math.abs(dz) < best) best = Math.min(best, Math.hypot(dx, dz))
		}
		return best
	}
	return {
		forest: indoors ? 0.25 : 1,
		inside: indoors ? 1 : 0,
		water: nearness(nearest(water), 3, 32),
		hens: herds.hens ? nearness(nearest(herds.hens()), 2, 26) : 0,
		geese: herds.geese ? nearness(nearest(herds.geese()), 3, 32) : 0,
		goats: herds.goats ? nearness(nearest(herds.goats()), 3, 30) : 0,
		frogs: herds.frogs ? nearness(nearest(herds.frogs()), 2, 18) : 0,
		bees: herds.bees ? nearness(nearest(herds.bees()), 1.5, 14) : 0
	}
}
