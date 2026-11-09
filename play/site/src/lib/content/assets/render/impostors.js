// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * PICTURES OF THINGS FAR AWAY — any asset, when it looks small (./lod.js), drawn as a picture of itself: photographed
 * once on this device's graphics card from eight sides, the pictures laid in a page of pictures shared by many kinds,
 * and each copy a single card standing upright at its foot, turned to the eye, showing it from the side the eye sees
 * it from. Two triangles a copy, every copy on a page in one draw call. Sandbox 4's trees far away
 * (src/lib/sandbox-2/interior/impostors.js), made for every asset: a chair, a pickup, a goat or a walnut tree.
 *
 * The picture is taken by our own renderer from the asset's coarsest shape, so it is no more than the asset is: nothing
 * of it comes from the asset itself. The card is lit as the scene is (as if it were a thing facing the eye a little
 * upward); its picture is taken in a soft light from the front, so it keeps its depth at any hour. It casts its
 * shadow too: in the shadow pass the card turns to the sun and throws the thing's outline.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { cardMaterials, castsAsNode, cutOf } from '../../render/nodes/index.js';
import { budget } from '../../render/budget.js';
import { isWebGPU, maxTextureSize, pmremFor, precompile } from '../../render/core.js';

/** how many sides each kind is photographed from */
export const FRAMES = 8;

/**
 * This photographer's version: part of the key every picture it took is kept by on this device (../cache.js
 * `levelKeyOf`, ./levels.js). Raised whenever a picture it takes changes (its light, its frame, its sides), so no
 * picture taken the old way is laid on a page again.
 */
export const VERSION = 1;

/**
 * @typedef {{ page: number, cell: number, size: number, foot: number }} Slot where a kind's pictures are: its page,
 *   its first cell there, and its frame (a square `size` metres a side, its lower edge `foot` metres above the
 *   asset's own ground)
 */

/**
 * The pictures of a renderer's kinds, page by page.
 * @param {THREE.WebGLRenderer} renderer
 * @param {{ px?: number, page?: number }} [o] each picture `px` pixels a side, on pages of `page` pixels a side
 */
export function createImpostors(renderer, o = {}) {
	// (the device's budget: a phone's pages a quarter of a desktop's, the same kinds on each)
	const most = Math.min(o.page ?? budget().picture.page, maxTextureSize(renderer));
	const px = Math.min(o.px ?? budget().picture.px, most);
	const cols = Math.floor(most / px), rows = cols;
	const kindsPerPage = Math.floor((cols * rows) / FRAMES);
	const group = new THREE.Group();
	group.name = 'asset pictures';
	/** @type {ReturnType<typeof pageOf>[]} */
	const pages = [];
	/** the cut every card is cut by (a picture has no inside: no faces) */
	const cut = cutOf();

	// where the pictures are taken: a soft light from the front and all round, and a room's reflections for the metals
	const studio = new THREE.Scene();
	studio.add(new THREE.AmbientLight('#ffffff', Math.PI * 0.45));
	const key = new THREE.DirectionalLight('#ffffff', Math.PI * 0.55);
	studio.add(key, key.target);
	// the room's reflections made when the first picture is to be taken, not with the renderer: a world that takes none
	// (drawing every kind at its finest, as MaiaCity V1 does) never waits for them (seconds on a software GPU)
	let env = null;
	const lit = () => {
		if (env) return;
		const pmrem = pmremFor(renderer); // (made at the first picture: the renderer draws by then)
		env = pmrem.fromScene(new RoomEnvironment(), 0.04);
		pmrem.dispose();
		studio.environment = env.texture;
	};
	studio.environmentIntensity = 0.35;
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
	const shot = new THREE.WebGLRenderTarget(px, px, { samples: 4, generateMipmaps: false });
	shot.texture.colorSpace = THREE.SRGBColorSpace;

	function pageOf() {
		const target = new THREE.WebGLRenderTarget(cols * px, rows * px, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
		target.texture.colorSpace = THREE.SRGBColorSpace;
		target.texture.anisotropy = 4;
		renderer.initRenderTarget(target);
		const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
		const geo = new THREE.InstancedBufferGeometry();
		geo.index = quad.index;
		geo.setAttribute('position', quad.attributes.position);
		geo.setAttribute('normal', quad.attributes.normal);
		geo.setAttribute('uv', quad.attributes.uv);
		const { material, depth } = cardMaterials(target.texture, new THREE.Vector2(cols, rows), FRAMES, cut);
		const mesh = new THREE.Mesh(geo, material);
		mesh.name = `asset pictures ${pages.length + 1}`;
		mesh.frustumCulled = false;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.customDepthMaterial = depth;
		castsAsNode(mesh, renderer);
		group.add(mesh);
		const page = { target, quad, geo, material, depth, mesh, kinds: 0, n: 0, cap: 0, attrs: null, stale: false };
		grow(page, 64);
		return page;
	}

	/** room on a page for `need` cards */
	function grow(page, need) {
		if (page.cap >= need) return;
		const cap = Math.max(need, page.cap * 2, 64);
		const make = (name, size) => {
			const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * size), size);
			a.setUsage(THREE.DynamicDrawUsage);
			const old = page.attrs?.[name];
			if (old) a.array.set(old.array.subarray(0, page.n * size));
			page.geo.setAttribute(name, a);
			return a;
		};
		page.attrs = { aAt: make('aAt', 3), aSize: make('aSize', 1), aTurn: make('aTurn', 1), aCell: make('aCell', 1), aFade: make('aFade', 1) };
		page.cap = cap;
	}

	/** the asset as it stands in the studio: its drawings, each at its places */
	function thingOf(level) {
		const thing = new THREE.Group();
		for (const d of level.draws) {
			const m = new THREE.InstancedMesh(d.geometry, d.material, d.n);
			m.instanceMatrix.array.set(d.locals);
			if (d.colors) m.instanceColor = new THREE.InstancedBufferAttribute(d.colors, 3);
			m.frustumCulled = false;
			thing.add(m);
		}
		return thing;
	}

	/** a kind's shaders as the studio lights them, made before its picture is taken (./index.js, `compiled`) */
	async function prepare(level) {
		lit();
		const thing = thingOf(level);
		const clip = renderer.localClippingEnabled;
		renderer.localClippingEnabled = false;
		const made = precompile(renderer, thing, camera, studio);
		renderer.localClippingEnabled = clip;
		await made;
		for (const m of thing.children) m.dispose();
	}

	/** room for a kind's pictures on a page, and its frame: square, as wide as it reaches out both ways or as tall as it
	 *  stands, whichever is more */
	function slotFor(level) {
		let p = pages.findIndex((x) => x.kinds < kindsPerPage);
		if (p < 0) {
			pages.push(pageOf());
			p = pages.length - 1;
		}
		const page = pages[p];
		const cell = page.kinds++ * FRAMES;
		const size = Math.max(0.05, Math.max(level.reach * 2, level.height - Math.min(0, level.bottom)) * 1.06);
		const mid = (Math.min(0, level.bottom) + level.height) / 2;
		return { page: p, cell, size, foot: mid - size / 2, mid };
	}

	/** where frame f of a slot is on its page (pixels) */
	const at = (slot, f) => ({ x: ((slot.cell + f) % cols) * px, y: Math.floor((slot.cell + f) / cols) * px });

	/**
	 * A kind photographed from its eight sides onto a page.
	 * @param {import('./prepare.js').Level} level the shape it is photographed from (its coarsest)
	 * @returns {Slot}
	 */
	function add(level) {
		lit();
		const { page: p, cell, size, foot, mid } = slotFor(level);
		const page = pages[p];
		const thing = thingOf(level);
		studio.add(thing);
		const D = level.reach + size + 10;
		camera.left = -size / 2;
		camera.right = size / 2;
		camera.top = size / 2;
		camera.bottom = -size / 2;
		camera.near = 0.05;
		camera.far = D * 2 + size * 2;
		camera.updateProjectionMatrix();
		const was = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), autoClear: renderer.autoClear, clip: renderer.localClippingEnabled };
		renderer.autoClear = false;
		renderer.localClippingEnabled = false;
		const to = new THREE.Vector2();
		// the page's smaller copies are not made here (three makes them again after every copy onto a page that has
		// them: the whole page, 2048 pixels a side, nine times a kind, seconds of a software GPU that every frame of the
		// world waits behind), but once a frame for every picture taken since (`settle`)
		const mips = page.target.texture.generateMipmaps;
		page.target.texture.generateMipmaps = false;
		for (let f = 0; f < FRAMES; f++) {
			const a = (f / FRAMES) * Math.PI * 2, c = cell + f;
			camera.position.set(Math.sin(a) * D, mid, Math.cos(a) * D);
			camera.lookAt(0, mid, 0);
			key.position.set(Math.sin(a) * D, mid + D * 0.6, Math.cos(a) * D);
			renderer.setRenderTarget(shot);
			// cleared to its own colour, see-through: from afar, where the picture is averaged down, its edges soften
			// into its own colour, never into black
			renderer.setClearColor(level.colour, 0);
			renderer.clear();
			renderer.render(studio, camera);
			renderer.copyTextureToTexture(shot.texture, page.target.texture, null, to.set((c % cols) * px, Math.floor(c / cols) * px));
		}
		page.target.texture.generateMipmaps = mips;
		page.stale = true;
		studio.remove(thing);
		for (const m of thing.children) m.dispose();
		renderer.setRenderTarget(was.target);
		renderer.setClearColor(was.color, was.alpha);
		renderer.autoClear = was.autoClear;
		renderer.localClippingEnabled = was.clip;
		return { page: p, cell, size, foot };
	}

	/** nothing, drawn into a page: its smaller copies made again (`settle`) */
	const blank = new THREE.Scene();

	return {
		group,
		/**
		 * The photographer's version as this renderer's pictures are kept by (./levels.js `pictureKey`): WebGPU's apart
		 * (intent c1bee1f8), so a picture a WebGL page read back, rows in its order, is never laid on a WebGPU page's
		 */
		deriver: isWebGPU(renderer) ? `${VERSION}:webgpu` : VERSION,
		prepare,
		add,
		/** each picture's pixels a side, as this device takes them (part of a kept picture's key: ./levels.js) */
		px,
		/**
		 * A kind's eight pictures as they are on its page, read back off the graphics card without holding a frame
		 * (WebGL 2's asynchronous read): each frame's pixels, RGBA, as the page holds them. Null where this renderer
		 * can't read a page back so: on WebGPU (intent c1bee1f8) not yet, its pictures taken anew on each visit, until its
		 * read in its own row order is seen right on the Mac.
		 * @param {Slot} slot @returns {Promise<Uint8Array[] | null>}
		 */
		async read(slot) {
			const page = pages[slot.page];
			if (!page || isWebGPU(renderer) || typeof renderer.readRenderTargetPixelsAsync !== 'function' || !renderer.capabilities?.isWebGL2) return null;
			// a kind's frames side by side in one row of its page (its first cell a multiple of FRAMES, a row a multiple
			// of it): read back at once, one wait for the graphics card instead of eight, then cut into its frames
			if ((slot.cell % cols) + FRAMES <= cols) {
				const { x, y } = at(slot, 0);
				const row = px * FRAMES * 4;
				const all = new Uint8Array(row * px);
				await renderer.readRenderTargetPixelsAsync(page.target, x, y, px * FRAMES, px, all);
				return Array.from({ length: FRAMES }, (_, f) => {
					const out = new Uint8Array(px * px * 4);
					for (let r = 0; r < px; r++) out.set(all.subarray(r * row + f * px * 4, r * row + (f + 1) * px * 4), r * px * 4);
					return out;
				});
			}
			const out = [];
			for (let f = 0; f < FRAMES; f++) {
				const { x, y } = at(slot, f);
				const pixels = new Uint8Array(px * px * 4);
				await renderer.readRenderTargetPixelsAsync(page.target, x, y, px, px, pixels);
				out.push(pixels);
			}
			return out;
		},
		/**
		 * A kind's pictures laid on a page from what was read back before (`read`, kept on this device: ./levels.js):
		 * nothing photographed. Its frame as `add` makes it of the same shape.
		 * @param {import('./prepare.js').Level} level @param {Uint8Array[]} frames @returns {Slot}
		 */
		put(level, frames) {
			if (!Array.isArray(frames) || frames.length !== FRAMES || frames.some((f) => !(f instanceof Uint8Array) || f.length !== px * px * 4)) throw new Error('refused: pictures of another size');
			const slot = slotFor(level);
			const page = pages[slot.page];
			const mips = page.target.texture.generateMipmaps;
			page.target.texture.generateMipmaps = false;
			const to = new THREE.Vector2();
			frames.forEach((data, f) => {
				const t = new THREE.DataTexture(data, px, px, THREE.RGBAFormat, THREE.UnsignedByteType);
				t.colorSpace = THREE.SRGBColorSpace;
				t.generateMipmaps = false;
				const { x, y } = at(slot, f);
				renderer.copyTextureToTexture(t, page.target.texture, null, to.set(x, y));
				t.dispose();
			});
			page.target.texture.generateMipmaps = mips;
			page.stale = true;
			const { mid: _, ...out } = slot;
			return out;
		},
		/**
		 * The smaller copies of each page that has new pictures, made again (for afar, where a picture is averaged
		 * down): once for all the pictures taken since they were last made. Before a frame draws any card.
		 */
		settle() {
			const stale = pages.filter((p) => p.stale);
			if (!stale.length) return;
			const was = { target: renderer.getRenderTarget(), autoClear: renderer.autoClear };
			renderer.autoClear = false;
			for (const page of stale) {
				// drawing nothing into it makes them
				renderer.setRenderTarget(page.target);
				renderer.render(blank, camera);
				page.stale = false;
			}
			renderer.setRenderTarget(was.target);
			renderer.autoClear = was.autoClear;
		},
		/** starts a frame's cards: none on any page */
		begin() {
			for (const page of pages) page.n = 0;
		},
		/**
		 * One card: a copy of the kind in `slot` standing at x, y, z, turned by `turn` about the upright, at `scale`,
		 * `fade` how much of it shows (0 or 1 whole).
		 */
		push(slot, x, y, z, turn, scale, fade) {
			const page = pages[slot.page];
			if (page.n >= page.cap) grow(page, page.n + 1);
			const i = page.n++, A = page.attrs;
			A.aAt.array[i * 3] = x;
			A.aAt.array[i * 3 + 1] = y + slot.foot * scale;
			A.aAt.array[i * 3 + 2] = z;
			A.aSize.array[i] = slot.size * scale;
			A.aTurn.array[i] = turn;
			A.aCell.array[i] = slot.cell;
			A.aFade.array[i] = fade >= 1 ? 0 : fade;
		},
		/** ends a frame's cards: what was pushed is drawn */
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
		/** the cards cut away on the negative side of a plane too (no faces: a picture has no inside), or not (null) */
		cut(/** @type {THREE.Plane | null} */ plane) {
			if (plane) cut.a.value.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
			else cut.a.value.set(0, 0, -1, 1e5);
		},
		/** how many cards are drawn, and on how many pages */
		get drawn() {
			return pages.reduce((a, p) => a + p.n, 0);
		},
		get pages() {
			return pages.length;
		},
		dispose() {
			group.removeFromParent();
			for (const page of pages) {
				page.target.dispose();
				page.quad.dispose();
				page.geo.dispose();
				page.material.dispose();
				page.depth.dispose();
			}
			pages.length = 0;
			shot.dispose();
			env?.dispose();
		}
	};
}
