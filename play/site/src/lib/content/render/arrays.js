/*
 * ARRAY TEXTURES FROM PLAY'S FILES — KTX2 files (each a picture, by its BLAKE3 hash: play's file, ../../kernel/files.js) made into one
 * array texture, a layer each, so a shader picks its layer by a number (`texture(t, uv).depth(layer)`): nine surfaces
 * of three maps each would be more textures than a shader stage may sample (16).
 *
 * `useRenderer(renderer)` (./core.js, each renderer it makes) lets the files be read: the transcoder picks the
 * compressed format the graphics card takes. Without one (the census, a test) nothing is read and the layers stay the
 * placeholder they start as.
 */
import * as THREE from 'three';
import { fileUrl } from '../../kernel/files.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

/** @type {KTX2Loader | null} */
let loader = null;
/** @type {Map<string, Promise<THREE.CompressedTexture>>} each file, transcoded once */
const files = new Map();

/** the renderer the files are transcoded for (the first one made on the page) @param {THREE.WebGLRenderer} renderer */
export function useRenderer(renderer) {
	if (loader || typeof window === 'undefined') return;
	try {
		loader = new KTX2Loader().setTranscoderPath('/basis/').setWorkerLimit(2).detectSupport(renderer);
	} catch {
		// (the census's counting renderer has no graphics card to transcode for)
		loader = null;
	}
}

/** @param {string} file `<hash>.ktx2` */
const read = (file) => {
	let p = files.get(file);
	if (!p) files.set(file, (p = /** @type {KTX2Loader} */ (loader).loadAsync(fileUrl(file.replace(/\.ktx2$/, '')))));
	return p;
};

/**
 * An array texture of one layer per file, a grey placeholder of a pixel a layer until every file is read (then
 * `onReady` is told, to rebuild what samples it). Files of one size and encoding each.
 * @param {string[]} list the files, `<hash>.ktx2`, in layer order
 * @param {{ srgb?: boolean, onReady?: (t: THREE.Texture) => void }} [o]
 * @returns {THREE.DataArrayTexture} the placeholder, its `userData.ready` a promise of the array
 */
export function arrayOf(list, o = {}) {
	const n = Math.max(1, list.length);
	const place = new THREE.DataArrayTexture(new Uint8Array(4 * n).fill(128), 1, 1, n);
	place.colorSpace = o.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
	place.needsUpdate = true;
	if (!loader || !list.length) return place;
	place.userData.ready = Promise.all(list.map(read))
		.then((layers) => {
			const first = /** @type {THREE.CompressedTexture} */ (layers[0]);
			// each level: every layer's bytes of it, one after the other
			const mipmaps = first.mipmaps.map((m, l) => {
				const parts = layers.map((t) => /** @type {{ data: Uint8Array }} */ (t.mipmaps[l]).data);
				const data = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
				let at = 0;
				for (const p of parts) data.set(p, (at += p.length) - p.length);
				return { data, width: m.width, height: m.height };
			});
			const t = new THREE.CompressedArrayTexture(/** @type {any} */ (mipmaps), first.image.width, first.image.height, n, first.format, first.type);
			t.colorSpace = place.colorSpace;
			t.wrapS = t.wrapT = THREE.RepeatWrapping;
			t.minFilter = THREE.LinearMipmapLinearFilter;
			t.magFilter = THREE.LinearFilter;
			t.anisotropy = 8;
			t.generateMipmaps = false;
			t.needsUpdate = true;
			// the files' own copies were never sent to the card: let their bytes go
			for (const f of list) files.delete(f);
			o.onReady?.(t);
			return t;
		})
		.catch((e) => console.warn('array texture:', e));
	return place;
}
