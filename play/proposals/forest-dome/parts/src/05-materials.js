/* ---- the materials, as they are in daylight (colours linear, roughness as the real surface reads) ---- */

/**
 * How much of the sky an indoor surface sees: the page lights everything by the open sky's light as well as the sun's,
 * and a room under the closed shell sees little of that sky; so the materials that are mostly indoors take a part of
 * it (their reflections and their shade), the rest of their light the sun's through the glass and the lamps'.
 */
const INDOOR = 0.32;

/** surfaces shared by several materials (a colour tints them): painted once */
const SHARED = {};
const shared = (name, make) => (SHARED[name] ??= make());
const C = {};
/** a named colour, parsed once, linear */
const col = (hex) => (C[hex] ??= lin(hex));

// the bioceramic panels outside and the frames round the glass: a matt warm white, finely porous, faintly clouded
material('ceramic', 1.6, () => {
	const s = shared('ceramic', () =>
		surface({
			px: 512,
			relief: 1.2,
			paint: (u, v, o) => {
				const c = cells(u, v, 90, 90, 11, 0.9);
				const pit = 1 - smooth((0.16 - c.f1) * 9);
				const cloud = fbm(u, v, 3, 3, 13) - 0.5;
				o.h = 0.7 + 0.3 * pit;
				o.c = scalec(col('#efe9de'), 1 + cloud * 0.07 - (1 - pit) * 0.05);
				o.k = 0.62 + cloud * 0.12 - (1 - pit) * 0.1;
			}
		})
	);
	return new THREE.MeshPhysicalMaterial({ color: '#ffffff', ...s, roughness: 1, specularIntensity: 0.45, normalScale: new THREE.Vector2(0.6, 0.6) });
});

// the inside of the closed panels: a warm sand lime render, trowelled (the faceted walls of the rooms)
material('relief', 2.2, () => {
	const s = shared('relief', () =>
		surface({
			px: 512,
			maps: ['map', 'normalMap'],
			relief: 1.6,
			paint: (u, v, o) => {
				const sweep = fbm(u, v, 5, 3, 23, 9);
				const sand = hash2((u * 512) | 0, (v * 512) | 0, 29);
				const cloud = fbm(u, v, 2, 2, 37) - 0.5;
				o.h = 0.7 * sweep + 0.12 * sand;
				o.c = scalec(mixc(col('#d8c2a3'), col('#cdb08c'), 0.5 + cloud * 1.6), 0.97 + o.h * 0.06);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: INDOOR });
});

/**
 * Oak as it is sawn (Samuel 2026-11-05: the first draft's bold figure read most like wood): its growth rings as long
 * wavy lines along u, warped into the arches of flat-sawn boards, early and late wood in two browns, a few open pores;
 * finished satin (oiled), never glossy. `planks`: a floor of staggered boards 0.2 × 2 m over 2 m.
 */
const woodSurface = (seed, planks) =>
	surface({
		px: planks ? 768 : 512,
		py: planks ? 768 : 256,
		relief: 1.1,
		paint: (u, v, o) => {
			let pu = u, pv = v, gap = 0, tone = 0;
			if (planks) {
				const row = Math.floor(v * 10);
				pu = mod(u + hash2(row, 0, seed), 1);
				const f = v * 10 - row;
				gap = Math.min(f, 1 - f) < 0.012 || Math.min(pu, 1 - pu) < 0.003 ? 1 : 0;
				pv = f + row * 0.37;
				tone = (hash2(row, 7, seed) - 0.5) * 0.18;
			}
			const warp = fbm(pu, pv, 2, 3, seed + 3, 6) * 2.4;
			const ring = Math.pow(Math.abs(Math.sin((pv * 18 + warp) * Math.PI)), 6);
			const pore = hash2((pu * 900) | 0, (pv * 260) | 0, seed + 5) > 0.93 ? 1 : 0;
			o.h = 0.75 - 0.22 * ring - 0.12 * pore - 0.6 * gap;
			o.c = scalec(mixc(col('#c79a68'), col('#a8774a'), ring * 0.8 + (warp / 2.4 - 0.5) * 0.6), 1 + tone - (1 - o.h) * 0.6);
			// oiled oak is satin, not glossy: a soft sheen, never a glare
			o.k = 0.62 + (1 - o.h) * 0.25;
		}
	});
// oiled oak for furniture, rails and doors (its grain along u)
material('oak', 1.2, () => {
	const s = shared('oak', () => woodSurface(41, false));
	return new THREE.MeshPhysicalMaterial({ color: '#ffffff', ...s, roughness: 1, clearcoat: 0.05, clearcoatRoughness: 0.65, specularIntensity: 0.6, normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: INDOOR * 1.1 });
});
// a lighter limed oak for the floors: boards 20 cm by 2 m
material('floor', 2, () => {
	const s = shared('floor', () => woodSurface(43, true));
	return new THREE.MeshPhysicalMaterial({ color: '#efe4d6', ...s, roughness: 1, clearcoat: 0.05, clearcoatRoughness: 0.6, specularIntensity: 0.7, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: INDOOR });
});
// weathered oak outside the rooms (the bridges, the forest's benches): silvered
material('timber', 1.2, () => {
	const s = shared('oak', () => woodSurface(41, false));
	return new THREE.MeshStandardMaterial({ color: '#b3aa9c', map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: 1 });
});

// travertine: cream, with the long pores of its bedding (tables, the bathrooms, sills)
material('travertine', 1, () => {
	const s = shared('travertine', () =>
		surface({
			px: 512,
			relief: 2,
			paint: (u, v, o) => {
				// honed and filled, as a vanity's or a table's top is: its pores small (a few millimetres, longer along the
				// bedding), most of them filled flush in a paler tone, a few left open; the bedding in soft bands
				const bed = fbm(u, v, 2, 3, 51, 14);
				const pore = bed > 0.5 ? cells(u, v, 34, 140, 53, 1) : null;
				const hole = pore ? smooth((0.2 - pore.f1) * 9) : 0;
				const open = hole > 0 && pore.id > 0.8;
				o.h = 0.85 - (open ? 0.3 : 0.04) * hole;
				const stone = mixc(col('#e7dcc8'), col('#cdb895'), bed * 1.1 - 0.15);
				o.c = scalec(mixc(stone, open ? col('#a8956f') : col('#efe6d4'), hole * (open ? 0.7 : 0.45)), 0.94 + o.h * 0.06);
				o.k = 0.3 + (open ? hole * 0.4 : 0);
			}
		})
	);
	return new THREE.MeshPhysicalMaterial({ color: '#ffffff', ...s, roughness: 1, specularIntensity: 0.6, envMapIntensity: INDOOR * 1.2 });
});

// limestone for the arcade: honed blocks, warm grey-cream, with fossil grain and a little weathering
material('limestone', 1.5, () => {
	const s = shared('limestone', () =>
		surface({
			px: 512,
			relief: 2.2,
			paint: (u, v, o) => {
				const w = fbm(u, v, 3, 4, 65);
				const grain = hash2((u * 512) | 0, (v * 512) | 0, 63);
				const stain = span(fbm(u, v, 2, 2, 67), 0.6, 0.85);
				o.h = 0.6 + 0.3 * w + 0.1 * grain;
				o.c = scalec(mixc(mixc(col('#ddd2bd'), col('#c9bb9f'), w), col('#a99f8c'), stain * 0.5), 0.92 + o.h * 0.1 - grain * 0.04);
				o.k = 0.85;
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});

// lime plaster for the rooms' walls: warm white, soft and uneven
material('plaster', 2, () => {
	const p = shared('plaster', () =>
		surface({
			px: 512,
			maps: ['map', 'normalMap'],
			relief: 1,
			paint: (u, v, o) => {
				// a trowelled lime finish: soft undulation only (a per-pixel grain in its relief shimmered as a screen-door
				// pattern across a wall); its sand a faint speckle in the colour alone
				o.h = 0.75 * fbm(u, v, 4, 3, 71) + 0.25 * fbm(u, v, 24, 2, 73);
				const sand = hash2((u * 512) | 0, (v * 512) | 0, 73);
				o.c = scalec(col('#eee5d6'), 0.97 + (o.h - 0.5) * 0.07 + (sand - 0.5) * 0.02);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: p.map, normalMap: p.normalMap, roughness: 0.92, envMapIntensity: INDOOR });
});

/** a plain weave: threads over and under, `n` threads to the tile, slubs in them */
const weave = (seed, n) =>
	surface({
		px: 256,
		maps: ['map', 'normalMap'],
		relief: 3,
		paint: (u, v, o) => {
			const a = Math.sin(u * n * TAU), b = Math.sin(v * n * TAU);
			const over = (Math.floor(u * n * 2) + Math.floor(v * n * 2)) % 2 ? a : b;
			const slub = fbm(u, v, n / 4, 2, seed, 2) - 0.5;
			o.h = 0.5 + 0.35 * Math.abs(over) + 0.3 * slub;
			o.c = scalec([0.85, 0.85, 0.85], 0.85 + o.h * 0.2);
		}
	});
// linen: bedding, curtains, cushions (tinted by its colour)
const fabric = (name, colour, o = {}) =>
	material(name, 0.12, () => {
		const s = shared('linen', () => weave(81, 40));
		return new THREE.MeshPhysicalMaterial({ color: colour, map: s.map, normalMap: s.normalMap, roughness: 0.92, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new THREE.Color(colour).lerp(new THREE.Color('#ffffff'), 0.4), side: o.side ?? THREE.FrontSide, envMapIntensity: INDOOR });
	});
fabric('linen', '#f2ede4');
fabric('linen-oat', '#d8cbb4');
fabric('linen-rust', '#b5643f');
fabric('linen-sage', '#9aa58a');
fabric('linen-clay', '#c9a38a');
fabric('curtain', '#f3eee6', { side: THREE.DoubleSide });
// bouclé: loops of wool, for the sofas and chairs
const loops = (name, colour) =>
	material(name, 0.1, () => {
		const s = shared('boucle', () =>
			surface({
				px: 256,
				maps: ['map', 'normalMap'],
				relief: 4,
				paint: (u, v, o) => {
					const c = cells(u, v, 22, 22, 91, 1);
					o.h = smooth(1 - c.f1 * 1.6) * 0.85 + 0.15 * c.id;
					o.c = scalec([0.9, 0.9, 0.9], 0.78 + o.h * 0.3);
				}
			})
		);
		return new THREE.MeshPhysicalMaterial({ color: colour, map: s.map, normalMap: s.normalMap, roughness: 0.95, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(colour), envMapIntensity: INDOOR });
	});
loops('boucle', '#ece4d6');
loops('boucle-sand', '#d6c2a2');

// jute: a round braided rug, its UVs u round and v out from the middle (rings of braid)
material('jute', 0.25, () => {
	const s = shared('jute', () =>
		surface({
			px: 256,
			maps: ['map', 'normalMap'],
			relief: 4,
			paint: (u, v, o) => {
				const braid = Math.abs(Math.sin(v * 8 * Math.PI)) * 0.6 + 0.4 * Math.abs(Math.sin((u * 40 + (Math.floor(v * 8) % 2) * 0.5) * Math.PI));
				o.h = braid * 0.85 + 0.15 * hash2((u * 256) | 0, (v * 256) | 0, 101);
				o.c = scalec(col('#b49867'), 0.7 + o.h * 0.45);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.95, envMapIntensity: INDOOR });
});

// terracotta: pots and the kitchens' floor tiles, unglazed, a little blotched
material('terracotta', 0.6, () => {
	const s = shared('terracotta', () =>
		surface({
			px: 256,
			maps: ['map', 'normalMap'],
			relief: 1.5,
			paint: (u, v, o) => {
				const b = fbm(u, v, 3, 3, 113);
				o.h = 0.6 + 0.4 * hash2((u * 256) | 0, (v * 256) | 0, 111) * 0.5 + 0.2 * b;
				o.c = scalec(mixc(col('#b0603c'), col('#c7835a'), b), 0.9 + o.h * 0.15);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.88 });
});

// the paths (Samuel 2026-11-05): light grey-whitish rounded-stone gravel, pea gravel of river pebbles 6–14 mm packed
// together, white to pale grey with a few warmer and bluer stones, each a little dome with soft shade in the gaps
material('gravel', 0.6, () => {
	const s = shared('gravel', () =>
		surface({
			px: 512,
			relief: 3.5,
			paint: (u, v, o) => {
				const p = cells(u, v, 58, 58, 121, 1);
				// each pebble a rounded dome over its cell (a little elongated by its own turn), the gaps between in shade
				const dome = smooth(1 - p.f1 * 1.7);
				const gap = 1 - smooth((p.f2 - p.f1) * 7);
				const tone = p.id;
				const stone = tone < 0.12 ? col('#cfc6b8') : tone < 0.2 ? col('#b9bcc0') : mixc(col('#e9e7e2'), col('#c9c8c4'), (tone - 0.2) / 0.8);
				o.h = 0.25 + 0.7 * dome - 0.25 * gap;
				o.c = mixc(scalec(stone, 0.88 + 0.14 * dome), col('#8e8a84'), gap * 0.75);
				o.k = 0.62 - dome * 0.12 + gap * 0.3;
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});

// the forest floor: dark humus under a litter of fallen leaves, each an elongated leaf lying its own way, overlapping
// (the vertex colour darkens it near water)
/** the nearest leaf of a layer at u, v: its cell's leaf laid at its own angle, its distance in leaf lengths (< 1 on it) */
function leafAt(u, v, n, s, len, wid) {
	const c = cells(u, v, n, n, s, 1);
	let dx = (u - c.px) * n, dy = (v - c.py) * n;
	dx -= Math.round(dx / n) * n;
	dy -= Math.round(dy / n) * n;
	const a = c.id * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
	const x = dx * ca + dy * sa, y = -dx * sa + dy * ca;
	// a leaf: pointed at both ends (its width falls toward its tips), with a midrib
	const t = x / len;
	const half = wid * Math.max(0, 1 - t * t) * (1 - 0.25 * t);
	const across = half > 1e-4 ? Math.abs(y) / half : 9;
	return { on: Math.abs(t) < 1 && across < 1, rib: Math.abs(y) < 0.012 && Math.abs(t) < 0.95, edge: across, id: c.id };
}
material('soil', 2.5, () => {
	const s = shared('soil', () =>
		surface({
			// only where the page cannot lay the floor's biome (the viewer paints the biome over it): small
			px: 256,
			relief: 2.5,
			paint: (u, v, o) => {
				const grain = hash2((u * 256) | 0, (v * 256) | 0, 149);
				const top = leafAt(u, v, 30, 141, 0.46, 0.19);
				const low = top.on ? null : leafAt(u, v, 22, 143, 0.5, 0.22);
				const leaf = top.on ? top : low?.on ? low : null;
				const humus = mixc(col('#30241a'), col('#4a3826'), grain * 0.6 + fbm(u, v, 6, 2, 147) * 0.4);
				if (leaf) {
					const brown = mixc(mixc(col('#7d6340'), col('#4f3a25'), leaf.id), col('#a88a5a'), (leaf.id * 7) % 1 < 0.12 ? 0.55 : 0);
					const shade = leaf === top ? 1 : 0.72;
					o.h = (leaf === top ? 0.75 : 0.55) - 0.15 * leaf.edge * leaf.edge + (leaf.rib ? 0.06 : 0);
					o.c = scalec(brown, shade * (0.85 + grain * 0.2) * (leaf.rib ? 1.12 : 1) * (1 - 0.25 * leaf.edge * leaf.edge));
					o.k = 0.82;
				} else {
					o.h = 0.25 + 0.2 * grain;
					o.c = scalec(humus, 0.8 + grain * 0.4);
					o.k = 0.95;
				}
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});

// river stones: smooth, grey to sandy, mottled (the brook's banks and bed, stepping stones)
material('stone', 0.6, () => {
	const s = shared('stone', () =>
		surface({
			px: 256,
			relief: 1,
			paint: (u, v, o) => {
				const f = fbm(u, v, 4, 4, 161);
				o.h = 0.6 + 0.3 * f;
				o.c = scalec(mixc(col('#8e8a82'), col('#b7aa94'), fbm(u, v, 2, 2, 163)), 0.85 + f * 0.2);
				o.k = 0.55 + (1 - f) * 0.3;
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});
// wet stone under the water: darker, smoother
material('stone-wet', 0.6, () => {
	mat('stone');
	const s = SHARED.stone;
	return new THREE.MeshStandardMaterial({ color: '#8a8478', map: s.map, normalMap: s.normalMap, roughness: 0.3 });
});

// flagstones: irregular limestone slabs in a crazy paving, mortar between (the arcade, the plaza before the rooms)
material('flag', 3, () => {
	const s = shared('flag', () =>
		surface({
			px: 512,
			relief: 2.5,
			paint: (u, v, o) => {
				const c = cells(u, v, 7, 7, 171, 0.8);
				const joint = 1 - smooth((c.f2 - c.f1) * 18);
				const grain = hash2((u * 512) | 0, (v * 512) | 0, 173);
				const slab = mixc(col('#cdbfa6'), col('#a99a82'), c.id * 0.8 + grain * 0.2);
				o.h = 0.8 - 0.6 * joint + 0.08 * grain;
				o.c = mixc(scalec(slab, 0.92 + grain * 0.1), col('#7a7064'), joint);
				o.k = 0.7 + joint * 0.25;
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', ...s, roughness: 1 });
});

// the brook's and the pond's water: clear, a little tea-brown in its depth, its surface rippled
material('water', 2, () => {
	const s = shared('water', () =>
		surface({
			px: 256,
			maps: ['normalMap'],
			relief: 1.5,
			paint: (u, v, o) => {
				o.h = 0.5 * fbm(u, v, 6, 3, 181) + 0.5 * fbm(u, v, 3, 2, 183, 9);
			}
		})
	);
	// shallow forest water is dark and clear: its bed seen through it near, the light of the trees and the glass in it
	// softly; not a mirror of the open sky (which turned a brook white seen at a low angle)
	return new THREE.MeshPhysicalMaterial({ color: '#2c3a30', normalMap: s.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.2, metalness: 0, ior: 1.33, specularIntensity: 0.45, envMapIntensity: 0.35, transparent: true, opacity: 0.72, depthWrite: false });
});

// the glass of the shell and the façades: clear, faintly green at its edges
material('glass', 1, () => new THREE.MeshPhysicalMaterial({ color: '#eef4f1', roughness: 0.03, metalness: 0, ior: 1.52, specularIntensity: 1, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }));
// the doors' and windows' frames: dark bronzed steel, and brass for taps and handles
material('bronze', 1, () => new THREE.MeshStandardMaterial({ color: '#3f362c', metalness: 0.85, roughness: 0.42 }));
material('brass', 1, () => new THREE.MeshStandardMaterial({ color: '#c9a565', metalness: 1, roughness: 0.28 }));
// glazed ceramic (the tubs, basins, the white of a mushroom lamp's foot)
material('glaze', 1, () => new THREE.MeshPhysicalMaterial({ color: '#f4f1ea', roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: INDOOR * 1.2 }));
// a paper lantern's shade, lit from inside
material('paper', 0.5, () => {
	const s = shared('paper', () =>
		surface({
			px: 256,
			maps: ['map'],
			paint: (u, v, o) => {
				o.c = scalec([1, 0.97, 0.92], 0.9 + 0.1 * fbm(u, v, 40, 2, 191, 8));
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#fff8ee', map: s.map, emissive: '#ffcf96', emissiveMap: s.map, emissiveIntensity: 1.6, roughness: 0.9, side: THREE.DoubleSide });
});
// a lamp's opal glass, lit
material('opal', 1, () => new THREE.MeshStandardMaterial({ color: '#fffaf2', emissive: '#ffd6a0', emissiveIntensity: 2.2, roughness: 0.4 }));
// a green roof of sedum on the arcade: low mats of green, bronze and red
material('sedum', 1, () => {
	const s = shared('sedum', () =>
		surface({
			px: 512,
			maps: ['map', 'normalMap'],
			relief: 3,
			paint: (u, v, o) => {
				const c = cells(u, v, 70, 70, 201, 1);
				const patch = fbm(u, v, 9, 3, 205);
				o.h = smooth(1 - c.f1 * 1.8) * 0.8 + 0.2 * c.id;
				const green = mixc(col('#6c7d38'), col('#8f9446'), c.id);
				o.c = scalec(mixc(green, col('#8e5638'), span(patch, 0.55, 0.75) * 0.8), 0.55 + o.h * 0.6);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.9 });
});
// zellige: hand-made glazed tiles of 10 cm, each a little uneven, for the bathrooms
material('zellige', 0.5, () => {
	const s = shared('zellige', () =>
		surface({
			px: 512,
			relief: 1.5,
			paint: (u, v, o) => {
				const x = (u * 5) % 1, y = (v * 5) % 1;
				const joint = Math.min(x, 1 - x, y, 1 - y) < 0.025;
				const t = hash2(Math.floor(u * 5), Math.floor(v * 5), 213);
				const wob = fbm(u, v, 20, 2, 211);
				o.h = joint ? 0.2 : 0.7 + 0.15 * wob;
				o.c = joint ? col('#d9d3c7') : scalec(mixc(col('#dfe6dc'), col('#b9cbbf'), t), 0.95 + (wob - 0.5) * 0.15);
				o.k = joint ? 0.9 : 0.12 + (wob - 0.5) * 0.1;
			}
		})
	);
	return new THREE.MeshPhysicalMaterial({ color: '#ffffff', ...s, roughness: 1, clearcoat: 0.4, clearcoatRoughness: 0.15, envMapIntensity: INDOOR * 1.2 });
});
// bark for the logs the mushrooms grow on and the posts the climbers climb
material('bark', 0.8, () => {
	const s = shared('bark', () =>
		surface({
			px: 256,
			maps: ['map', 'normalMap'],
			relief: 3,
			paint: (u, v, o) => {
				const c = cells(u, v, 3, 12, 223);
				const fissure = 1 - smooth((c.f2 - c.f1) * 9);
				o.h = 0.65 - 0.45 * fissure + 0.1 * c.id;
				o.c = scalec(mixc(col('#4a3d31'), col('#6e6152'), c.id), 0.6 + o.h * 0.6);
			}
		})
	);
	return new THREE.MeshStandardMaterial({ color: '#ffffff', map: s.map, normalMap: s.normalMap, roughness: 0.95 });
});
// a plain dark for the shadow gaps and the feet of furniture
material('shadow', 1, () => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.9 }));
