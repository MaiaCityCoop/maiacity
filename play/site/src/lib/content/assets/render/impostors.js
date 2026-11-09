// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * PICTURES OF THINGS FAR AWAY — an asset that looks small (./lod.js) as a hemi-octahedral impostor (Brucks): baked once
 * from `views` × `views` directions over its upper half (colours unlit, normals, depth) into a block on two pages; a
 * copy one card, its three nearest views blended and lit as the scene is (../../render/nodes/impostor.js).
 */
import * as THREE from 'three';
import { castsAsNode, cutOf } from '../../render/nodes/index.js';
import { bake, bakeOf, cardMaterials } from '../../render/nodes/impostor.js';
import { budget } from '../../render/budget.js';
import { isWebGPU } from '../../render/core.js';

/** a kind's picture is kept as two images: its views' colours; their normals and depth */
export const FRAMES = 2;

/** in every kept picture's key (./levels.js): raised whenever a picture changes */
export const VERSION = 3;

/** a direction (y up; below the horizon as on it) as its place u, v (−1…1) on the hemi-octahedral square */
export function encode(x, y, z) {
	y = Math.max(0, y);
	const s = Math.abs(x) + y + Math.abs(z) || 1;
	return [(x + z) / s, (x - z) / s];
}

/** the other way, unit */
export function decode(u, v) {
	const x = (u + v) / 2, z = (u - v) / 2, y = 1 - Math.abs(x) - Math.abs(z), l = Math.hypot(x, y, z);
	return [x / l, y / l, z / l];
}

/** view i, j of n × n */
export const viewOf = (i, j, n) => decode((i / (n - 1)) * 2 - 1, (j / (n - 1)) * 2 - 1);

/** the three views of n × n round a direction, each [i, j, weight], the weights summing to 1 */
export function nearest(x, y, z, n) {
	const [u, v] = encode(x, y, z);
	const gx = (u * 0.5 + 0.5) * (n - 1), gy = (v * 0.5 + 0.5) * (n - 1);
	const bx = Math.min(Math.max(Math.floor(gx), 0), n - 2), by = Math.min(Math.max(Math.floor(gy), 0), n - 2);
	const fx = gx - bx, fy = gy - by;
	return fx + fy < 1
		? [[bx, by, 1 - fx - fy], [bx + 1, by, fx], [bx, by + 1, fy]]
		: [[bx + 1, by + 1, fx + fy - 1], [bx, by + 1, 1 - fx], [bx + 1, by, 1 - fy]];
}

/** the up a view's camera is aimed by (its right up × d, its up d × right; from straight above, −z) */
export const upOf = (d) => (d[1] > 0.999 ? [0, 0, -1] : [0, 1, 0]);

/** triangles a card: five corners round a ball of diameter 1, flat side down */
export const TRIS = 3;
function hull() {
	const R = 0.5 / Math.cos(Math.PI / 5), p = [];
	for (let k = 0; k < 5; k++) p.push(R * Math.cos(Math.PI / 2 + k * 1.2566370614), R * Math.sin(Math.PI / 2 + k * 1.2566370614), 0);
	return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(p, 3)).setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4]);
}

/**
 * The pictures of a renderer's kinds, page by page: `views` × `views` views of `px` pixels a kind, on pages of `page`.
 * @param {THREE.WebGLRenderer} renderer @param {{ px?: number, page?: number, views?: number }} [o]
 */
export function createImpostors(renderer, o = {}) {
	const B = budget().picture;
	const most = Math.min(o.page ?? B.page, renderer.capabilities?.maxTextureSize ?? 8192);
	const N = o.views ?? B.views ?? 8;
	const px = Math.min(o.px ?? B.px, Math.floor(most / N));
	const cols = Math.floor(most / px), per = Math.floor(cols / N), side = N * px;
	const group = new THREE.Group();
	group.name = 'asset pictures';
	/** @type {any[]} */
	const pages = [];
	const cut = cutOf();
	const studio = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
	/** colours; normals and depth */
	const pair = (n, o) =>
		[THREE.SRGBColorSpace, THREE.NoColorSpace].map((space) => {
			const t = new THREE.WebGLRenderTarget(n, n, o);
			t.texture.colorSpace = space;
			t.texture.anisotropy = 4;
			return t;
		});
	const shots = pair(px, { samples: 4, generateMipmaps: false });
	const card = hull();
	/** `fn` drawn, the renderer's target, clear colour, clearing and clipping kept */
	function kept(fn) {
		const was = [renderer.getRenderTarget(), renderer.getClearColor(new THREE.Color()), renderer.getClearAlpha(), renderer.autoClear, renderer.localClippingEnabled];
		renderer.autoClear = renderer.localClippingEnabled = false;
		fn();
		renderer.setRenderTarget(was[0]);
		renderer.setClearColor(was[1], was[2]);
		[renderer.autoClear, renderer.localClippingEnabled] = was.slice(3);
	}

	function pageOf() {
		const targets = pair(cols * px, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
		for (const t of targets) renderer.initRenderTarget(t);
		const geo = new THREE.InstancedBufferGeometry().setIndex(card.index).setAttribute('position', card.attributes.position);
		const { material, depth } = cardMaterials(targets[0].texture, targets[1].texture, cols, N, cut);
		const mesh = new THREE.Mesh(geo, material);
		mesh.name = `asset pictures ${pages.length + 1}`;
		mesh.frustumCulled = false;
		mesh.castShadow = mesh.receiveShadow = true;
		mesh.customDepthMaterial = depth;
		castsAsNode(mesh, renderer);
		group.add(mesh);
		const page = { targets, geo, material, depth, mesh, kinds: 0, n: 0, cap: 0, attrs: null, stale: false };
		return grow(page, 64), page;
	}

	function grow(page, need) {
		if (page.cap >= need) return;
		const cap = Math.max(need, page.cap * 2, 64), was = page.attrs;
		page.attrs = {};
		for (const [k, n] of [['aAt', 3], ['aCard', 4]]) {
			const a = (page.attrs[k] = new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n).setUsage(THREE.DynamicDrawUsage));
			if (was) a.array.set(was[k].array.subarray(0, page.n * n));
			page.geo.setAttribute(k, a);
		}
		page.cap = cap;
	}

	/** the asset as baked: its drawings at their places */
	function thingOf(level) {
		const thing = new THREE.Group();
		for (const d of level.draws) {
			const m = new THREE.InstancedMesh(d.geometry, bakeOf(d.material).albedo, d.n);
			m.instanceMatrix.array.set(d.locals);
			if (d.colors) m.instanceColor = new THREE.InstancedBufferAttribute(d.colors, 3);
			m.frustumCulled = false;
			m.userData.made = d.material;
			thing.add(m);
		}
		return thing;
	}

	/** room for a kind's block on a page, and its ball */
	function slotFor(level) {
		let p = pages.findIndex((x) => x.kinds < per * per);
		if (p < 0) {
			pages.push(pageOf());
			p = pages.length - 1;
		}
		const b = pages[p].kinds++;
		const lo = Math.min(0, level.bottom), mid = (lo + level.height) / 2;
		const size = Math.max(0.05, Math.hypot(level.reach * 2, level.height - lo) * 1.02);
		return { page: p, cell: Math.floor(b / per) * N * cols + (b % per) * N, size, mid };
	}

	const at = (slot) => ({ x: (slot.cell % cols) * px, y: Math.floor(slot.cell / cols) * px });

	/** `fn` copied onto a page, its smaller copies made once after (`settle`), not after every copy */
	function onto(page, fn) {
		for (const t of page.targets) t.texture.generateMipmaps = false;
		fn();
		for (const t of page.targets) t.texture.generateMipmaps = true;
		page.stale = true;
	}

	/** a kind baked onto a page from its coarsest shape: its slot (page, block's first cell, ball's diameter and middle) */
	function add(level) {
		const slot = slotFor(level), { size, mid } = slot, page = pages[slot.page], thing = thingOf(level), h = size / 2, D = size * 2 + 10;
		studio.add(thing);
		Object.assign(camera, { left: -h, right: h, top: h, bottom: -h, near: 0.05, far: D + size * 2 });
		camera.updateProjectionMatrix();
		bake.mid.value = mid;
		bake.size.value = size;
		const to = new THREE.Vector2(), { x, y } = at(slot);
		kept(() => onto(page, () => {
			for (let j = 0; j < N; j++)
				for (let i = 0; i < N; i++) {
					const d = viewOf(i, j, N);
					bake.dir.value.set(...d);
					camera.position.set(d[0] * D, mid + d[1] * D, d[2] * D);
					camera.up.set(...upOf(d));
					camera.lookAt(0, mid, 0);
					for (let k = 0; k < 2; k++) {
						for (const m of thing.children) m.material = bakeOf(m.userData.made)[k ? 'normal' : 'albedo'];
						renderer.setRenderTarget(shots[k]);
						// cleared see-through to its own colour (normal: facing the eye), its edges averaging into it afar
						if (k) renderer.setClearColor(new THREE.Color().setRGB(d[0] * 0.5 + 0.5, d[1] * 0.5 + 0.5, d[2] * 0.5 + 0.5, THREE.NoColorSpace), 0);
						else renderer.setClearColor(level.colour, 0);
						renderer.clear();
						renderer.render(studio, camera);
						renderer.copyTextureToTexture(shots[k].texture, page.targets[k].texture, null, to.set(x + i * px, y + j * px));
					}
				}
		}));
		studio.remove(thing);
		for (const m of thing.children) m.dispose();
		return slot;
	}

	const blank = new THREE.Scene();

	return {
		group,
		/** its pictures' version as kept (./levels.js): WebGPU's apart */
		deriver: isWebGPU(renderer) ? `${VERSION}:webgpu` : VERSION,
		add,
		/** each view's pixels and views a side (a kept picture's key) */
		px,
		views: N,
		/** a kind's block of each page, RGBA, read back asynchronously; null where it can't be (WebGPU: not yet) */
		async read(slot) {
			const page = pages[slot.page];
			if (!page || isWebGPU(renderer) || !renderer.capabilities?.isWebGL2) return null;
			const { x, y } = at(slot), out = page.targets.map(() => new Uint8Array(side * side * 4));
			await Promise.all(page.targets.map((t, k) => renderer.readRenderTargetPixelsAsync(t, x, y, side, side, out[k])));
			return out;
		},
		/** a kind's picture laid from what `read` gave (kept: ./levels.js), nothing baked */
		put(level, frames) {
			if (!Array.isArray(frames) || frames.length !== FRAMES || frames.some((f) => !(f instanceof Uint8Array) || f.length !== side * side * 4)) throw new Error('refused: pictures of another size');
			const slot = slotFor(level);
			const page = pages[slot.page];
			const { x, y } = at(slot);
			onto(page, () =>
				frames.forEach((data, k) => {
					const t = new THREE.DataTexture(data, side, side, THREE.RGBAFormat, THREE.UnsignedByteType);
					t.colorSpace = page.targets[k].texture.colorSpace;
					t.generateMipmaps = false;
					renderer.copyTextureToTexture(t, page.targets[k].texture, null, new THREE.Vector2(x, y));
					t.dispose();
				})
			);
			return slot;
		},
		/** each page's smaller copies made again where new (drawing nothing into it), before a frame's cards */
		settle() {
			const stale = pages.filter((p) => p.stale);
			if (stale.length)
				kept(() => {
					for (const page of stale) {
						for (const t of page.targets) renderer.setRenderTarget(t), renderer.render(blank, camera);
						page.stale = false;
					}
				});
		},
		/** a frame's cards begin, are pushed, end (drawn) */
		begin() {
			for (const page of pages) page.n = 0;
		},
		/** a copy at x, y, z (its foot), turned `turn`, at `scale`, `fade` of it shown (0 or 1 whole) */
		push(slot, x, y, z, turn, scale, fade) {
			const page = pages[slot.page];
			if (page.n >= page.cap) grow(page, page.n + 1);
			const i = page.n++, A = page.attrs;
			const p = A.aAt.array, c = A.aCard.array;
			(p[i * 3] = x), (p[i * 3 + 1] = y + slot.mid * scale), (p[i * 3 + 2] = z);
			(c[i * 4] = slot.size * scale), (c[i * 4 + 1] = turn), (c[i * 4 + 2] = slot.cell), (c[i * 4 + 3] = fade >= 1 ? 0 : fade);
		},
		end() {
			for (const page of pages) {
				page.geo.instanceCount = page.n;
				page.mesh.visible = page.n > 0;
				for (const a of Object.values(page.attrs)) {
					a.clearUpdateRanges();
					a.addUpdateRange(0, page.n * a.itemSize);
					a.needsUpdate = true;
				}
			}
		},
		/** the cards cut on the negative side of a plane too, or not (null) */
		cut(/** @type {THREE.Plane | null} */ plane) {
			if (plane) cut.a.value.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
			else cut.a.value.set(0, 0, -1, 1e5);
		},
		get drawn() {
			return pages.reduce((a, p) => a + p.n, 0);
		},
		get pages() {
			return pages.length;
		},
		dispose() {
			group.removeFromParent();
			for (const page of pages) {
				for (const t of page.targets) t.dispose();
				page.geo.dispose();
				page.material.dispose();
				page.depth.dispose();
			}
			pages.length = 0;
			card.dispose();
			for (const t of shots) t.dispose();
		}
	};
}
