// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A WORLD'S SOUND — what its `sound:` nodes name (./contract.js), played with Web Audio round the camera: the bed (the
 * world's ambient loop, everywhere at once), and at its guests what their states call for, each where that guest
 * stands, panned and fading with distance as the camera moves: a horn once each time a guest's `state:horn` comes on,
 * a siren looped at each emergency vehicle whose `state:siren` is on (the nearest few), a truck's engine the same.
 * Recordings are play's files by hash (../../kernel/files.js), each fetched and decoded once. A browser lets a page
 * sound only once it has been touched: `unlock()` from a touch or a key.
 */
import { fileUrl } from '../../kernel/files.js';

/** how many loops of one kind sound at once (the nearest), how many one-shots, and how far a guest is heard (m) */
const LOOPS = 4;
const SHOTS = 6;
const REACH = 320;

/**
 * @param {{ fetchFile?: (hash: string) => Promise<ArrayBuffer> }} [o]
 */
export function createSound(o = {}) {
	/** @type {AudioContext | null} */
	let ctx = null;
	let master = null;
	const buffers = new Map();
	/** the world's sounds by what they are for */
	let sounds = new Map();
	let bed = null;
	/** the loops sounding now, by guest node, per kind; the one-shots playing */
	const loops = new Map();
	let shots = 0;
	/** each guest's states as they were last frame (for a horn's rising edge) */
	const was = new WeakMap();
	let muted = false;
	const fetchFile = o.fetchFile ?? ((h) => fetch(fileUrl(h)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`recording ${h.slice(0, 12)}… answered ${r.status}`)))));

	const audio = () => {
		if (!ctx) {
			ctx = new AudioContext();
			master = ctx.createGain();
			master.gain.value = muted ? 0 : 0.9;
			master.connect(ctx.destination);
		}
		return ctx;
	};
	const bufferOf = (hash) => {
		let b = buffers.get(hash);
		if (!b) {
			b = fetchFile(hash).then((bytes) => audio().decodeAudioData(bytes));
			b.catch(() => buffers.delete(hash));
			buffers.set(hash, b);
		}
		return b;
	};
	const panner = (c) => {
		const p = c.createPanner();
		p.panningModel = 'HRTF';
		p.distanceModel = 'inverse';
		p.refDistance = 8;
		p.rolloffFactor = 1.1;
		p.maxDistance = REACH * 2;
		return p;
	};
	const at = (p, v) => {
		if (p.positionX) (p.positionX.value = v.x), (p.positionY.value = v.y), (p.positionZ.value = v.z);
		else p.setPosition(v.x, v.y, v.z);
	};

	async function startBed() {
		const s = sounds.get('bed');
		if (!s || bed || !ctx || ctx.state !== 'running') return;
		bed = { pending: true };
		try {
			const buffer = await bufferOf(s.hash);
			const src = ctx.createBufferSource();
			src.buffer = buffer;
			src.loop = true;
			const g = ctx.createGain();
			g.gain.setValueAtTime(0, ctx.currentTime);
			g.gain.linearRampToValueAtTime(0.6 * s.gain, ctx.currentTime + 2);
			src.connect(g).connect(master);
			src.start();
			bed = { src, g };
		} catch {
			bed = null;
		}
	}

	function loopAt(kind, node, v) {
		const s = sounds.get(kind);
		let byNode = loops.get(kind);
		if (!byNode) loops.set(kind, (byNode = new Map()));
		let l = byNode.get(node);
		if (!l) {
			l = { pan: panner(ctx), g: ctx.createGain(), src: null };
			l.g.gain.value = 0;
			l.pan.connect(l.g).connect(master);
			byNode.set(node, l);
			bufferOf(s.hash)
				.then((buffer) => {
					if (!byNode.has(node) || l.gone) return;
					l.src = ctx.createBufferSource();
					l.src.buffer = buffer;
					l.src.loop = true;
					l.src.connect(l.pan);
					l.src.start(ctx.currentTime, Math.random() * buffer.duration);
					l.g.gain.linearRampToValueAtTime(0.9 * s.gain, ctx.currentTime + 0.4);
				})
				.catch((e) => console.warn(`a sound loop (${s.hash.slice(0, 8)}) is not played: ${e?.message ?? e}`));
		}
		at(l.pan, v);
		l.seen = true;
	}

	function shotAt(kind, v) {
		const s = sounds.get(kind);
		if (shots >= SHOTS) return;
		shots++;
		bufferOf(s.hash)
			.then((buffer) => {
				const src = ctx.createBufferSource();
				src.buffer = buffer;
				src.playbackRate.value = 0.92 + Math.random() * 0.16;
				const p = panner(ctx);
				at(p, v);
				const g = ctx.createGain();
				g.gain.value = 0.9 * s.gain;
				src.connect(p).connect(g).connect(master);
				src.onended = () => shots--;
				src.start(ctx.currentTime, 0, Math.min(buffer.duration, 2.5));
			})
			.catch(() => shots--);
	}

	const _v = { x: 0, y: 0, z: 0 };
	return {
		/** the world shown now: its sounds (./contract.js `worldOf`) */
		set(list) {
			this.stop();
			sounds = new Map(list.map((s) => [s.for, s]));
			void startBed();
		},
		/** the page's audio, unlocked by this touch or key */
		unlock() {
			const c = audio();
			if (c.state === 'suspended') void c.resume().then(startBed);
			else void startBed();
		},
		get running() {
			return ctx?.state === 'running';
		},
		mute(on) {
			muted = on;
			if (master) master.gain.value = on ? 0 : 0.9;
		},
		/** each frame: the listener where the camera is, the guests' sounds where they are */
		update(camera, guests) {
			if (!ctx || ctx.state !== 'running' || !sounds.size) return;
			const L = ctx.listener;
			const p = camera.position;
			const f = camera.getWorldDirection(new camera.position.constructor());
			if (L.positionX) {
				L.positionX.value = p.x;
				L.positionY.value = p.y;
				L.positionZ.value = p.z;
				L.forwardX.value = f.x;
				L.forwardY.value = f.y;
				L.forwardZ.value = f.z;
				L.upX.value = 0;
				L.upY.value = 1;
				L.upZ.value = 0;
			} else (L.setPosition(p.x, p.y, p.z), L.setOrientation(f.x, f.y, f.z, 0, 1, 0));
			// the nearest guests of each looped kind with it on
			const want = new Map();
			for (const g of guests) {
				if (g.away) continue;
				for (const c of g.node.children) {
					const n = c.name;
					if (!n.startsWith('state:')) continue;
					const kind = n.slice(6);
					if (!sounds.has(kind) || kind === 'bed') continue;
					const e = g.node.matrixWorld.elements;
					(_v.x = e[12]), (_v.y = e[13] + 1), (_v.z = e[14]);
					const d = Math.hypot(_v.x - p.x, _v.y - p.y, _v.z - p.z);
					const s = sounds.get(kind);
					let w = was.get(c);
					was.set(c, c.visible);
					if (!c.visible || d > REACH) continue;
					if (s.once) {
						if (w === false) shotAt(kind, { ..._v });
						continue;
					}
					if (!want.has(kind)) want.set(kind, []);
					want.get(kind).push({ node: g.node, d, v: { ..._v } });
				}
			}
			for (const [kind, list] of want) for (const x of list.sort((a, b) => a.d - b.d).slice(0, LOOPS)) loopAt(kind, x.node, x.v);
			for (const byNode of loops.values())
				for (const [node, l] of byNode) {
					if (l.seen) {
						l.seen = false;
						continue;
					}
					l.gone = true;
					l.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
					l.src?.stop(ctx.currentTime + 0.6);
					byNode.delete(node);
				}
		},
		stop() {
			if (bed?.src) {
				bed.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
				bed.src.stop(ctx.currentTime + 0.6);
			}
			bed = null;
			for (const byNode of loops.values()) for (const l of byNode.values()) (l.gone = true), l.src?.stop();
			loops.clear();
		},
		dispose() {
			this.stop();
			void ctx?.close();
			ctx = null;
		}
	};
}
