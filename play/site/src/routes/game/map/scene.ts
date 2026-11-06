// The world map in 3D (three.js): the valley floor and the hills and mountains round it, the plots as low rounded
// slabs, the river and the lakes, and every tree, rock and peak as instances, lit by a low sun with soft shadows. The
// camera moves as in a city builder: drag to pan, right-drag or two fingers to turn and tilt, wheel or pinch to zoom.
// Map metres become world units: x east, z south (the map's y), y up, the map's centre at the origin.
// In film mode (./film, scripts/flyover) nothing moves by itself: no loop, no controls; each `frame` puts the camera
// where a shot says and draws once, so a shot is the same picture every time it is rendered.

import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { FILL, RIM, terrain, type Biome, type Feature, type FeatureKind, type P, type Plot, type WorldMap } from './map';
import { buildCity } from './city';

const SKY = '#eee8da';
const FLOOR = '#e9e2cd';
const WATER = '#4f8a8b';
const PLOT_TOP = 1.6; // m above the ground

export interface World {
	/** outline and tint a plot as the picked one, or none */
	select(id: number | null): void;
	/** show the map built up as a city (./city.ts), or empty again */
	city(on: boolean): void;
	/** film mode: the camera at `eye` looking at `at` (world units) through a lens of `fov` degrees (vertical), the sun's
	 *  shadows following where it looks, drawn once */
	frame(eye: number[], at: number[], fov: number): void;
	dispose(): void;
}

export function createWorld(canvas: HTMLCanvasElement, map: WorldMap, on: { hover(p: Plot | null): void; pick(p: Plot | null): void }, film = false): World {
	const W = map.width, H = map.height;
	const X = (x: number) => x - W / 2, Z = (y: number) => y - H / 2;
	const ground = terrain(map.seed, map.river, map.massif);

	// a film reads each frame back off the canvas (and adds frames up for its shutter), so the drawing is kept
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: film });
	renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(SKY);
	scene.fog = new THREE.Fog(SKY, 3400, 10500);

	const camera = new THREE.PerspectiveCamera(38, 1, 10, 17000);
	camera.position.set(0, 1250, 1500);

	// light: a warm low sun from the north-west and a soft sky
	scene.add(new THREE.HemisphereLight('#fbf8f1', '#bdb6a2', 1.55));
	const sun = new THREE.DirectionalLight('#fff4e2', 2.2);
	const SUN = new THREE.Vector3(-900, 1150, -650);
	sun.position.copy(SUN);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	// the shadows cover what the camera looks at, more of it the farther it is, so they stay sharp up close
	Object.assign(sun.shadow.camera, { near: 100, far: 5200 });
	let shadowAt = new THREE.Vector4(NaN);
	const followSun = (exact = false) => {
		const t = controls.target, reach = THREE.MathUtils.clamp(camera.position.distanceTo(t) * 1.15, 450, 4600);
		if (!exact && Math.abs(shadowAt.x - t.x) < 4 && Math.abs(shadowAt.z - t.z) < 4 && Math.abs(shadowAt.w - reach) / reach < 0.05) return;
		// a film's shadows follow every frame, held to whole texels of the shadow map so their edges do not crawl
		const texel = (2 * reach) / sun.shadow.mapSize.x, x = exact ? Math.round(t.x / texel) * texel : t.x, z = exact ? Math.round(t.z / texel) * texel : t.z;
		shadowAt = new THREE.Vector4(x, 0, z, reach);
		sun.target.position.set(x, 0, z);
		sun.position.copy(sun.target.position).add(SUN);
		Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach });
		sun.shadow.camera.updateProjectionMatrix();
	};
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.8;
	sun.shadow.radius = 3;
	scene.add(sun, sun.target);

	const owned: { dispose(): void }[] = [];
	const keep = <T extends { dispose(): void }>(x: T) => (owned.push(x), x);

	// ── the ground: flat in the valley, hills and mountains beyond, coloured by height ──
	{
		const g = new THREE.PlaneGeometry(W + 2 * RIM, H + 2 * RIM, Math.round((W + 2 * RIM) / 24), Math.round((H + 2 * RIM) / 24));
		g.rotateX(-Math.PI / 2);
		const pos = g.attributes.position;
		for (let i = 0; i < pos.count; i++) pos.setY(i, ground(pos.getX(i) + W / 2, pos.getZ(i) + H / 2));
		const flat = keep(g.toNonIndexed());
		g.dispose();
		const p = flat.attributes.position;
		const colours = new Float32Array(p.count * 3);
		const c = new THREE.Color(), floor = new THREE.Color(FLOOR), grass = new THREE.Color('#c9d0a2'), rock = new THREE.Color('#bdb2a0'), top = new THREE.Color('#ece7de');
		for (let i = 0; i < p.count; i += 3) {
			const h = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
			if (h < 0.3) c.copy(floor);
			else {
				c.copy(floor).lerp(grass, Math.min(1, h / 55));
				if (h > 70) c.lerp(rock, Math.min(1, (h - 70) / 60));
				if (h > 150) c.lerp(top, Math.min(1, (h - 150) / 50));
				const j = 0.96 + ((i * 2654435761) % 1000) / 1000 * 0.08;
				c.multiplyScalar(j);
			}
			for (let k = 0; k < 3; k++) colours.set([c.r, c.g, c.b], (i + k) * 3);
		}
		flat.setAttribute('color', new THREE.BufferAttribute(colours, 3));
		flat.computeVertexNormals();
		const mesh = new THREE.Mesh(flat, keep(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
		mesh.receiveShadow = mesh.castShadow = true;
		scene.add(mesh);
	}

	// ── water: the river as layered ribbons (shore, dark edge, water), the lakes as layered shapes ──
	const waterMat = keep(new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.3, metalness: 0, side: THREE.DoubleSide }));
	const edgeMat = keep(new THREE.MeshLambertMaterial({ color: '#2f5254', side: THREE.DoubleSide }));
	const shoreMat = keep(new THREE.MeshLambertMaterial({ color: '#e6d8b6', side: THREE.DoubleSide }));
	{
		const curve = new THREE.CatmullRomCurve3(map.river.map(([x, y]) => new THREE.Vector3(X(x), 0, Z(y))));
		const pts = curve.getPoints(map.river.length * 4);
		for (const [w, y, mat] of [[2 * map.bank - 8, 0.12, shoreMat], [50, 0.4, edgeMat], [41, 0.7, waterMat]] as const) {
			const m = new THREE.Mesh(keep(ribbon(pts, w, y, false)), mat);
			m.receiveShadow = mat === shoreMat; // water takes no shadow: flat layers this close would streak
			scene.add(m);
		}
		for (const ring of map.lakes) {
			const smooth = new THREE.CatmullRomCurve3(ring.map(([x, y]) => new THREE.Vector3(x, 0, y)), true).getPoints(160).map((v) => [v.x, v.z] as P);
			for (const [d, y, mat] of [[22, 0.12, shoreMat], [3, 0.4, edgeMat], [0, 0.7, waterMat]] as const) {
				const shape = new THREE.Shape(offsetRing(smooth, d).map(([x, z]) => new THREE.Vector2(X(x), Z(z))));
				const g = keep(new THREE.ShapeGeometry(shape, 1));
				g.rotateX(Math.PI / 2);
				const m = new THREE.Mesh(g, mat);
				m.position.y = y;
				m.receiveShadow = mat === shoreMat;
				scene.add(m);
			}
		}
	}

	// ── the plots: low slabs with soft edges, one material per biome (and a tinted one for the picked plot) ──
	const plain = {} as Record<Biome, THREE.Material>, lit = {} as Record<Biome, THREE.Material>, warm = {} as Record<Biome, THREE.Material>;
	for (const b of Object.keys(FILL) as Biome[]) {
		plain[b] = keep(new THREE.MeshLambertMaterial({ color: FILL[b] }));
		warm[b] = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(FILL[b]).lerp(new THREE.Color('#f3c46a'), 0.22) }));
		lit[b] = keep(new THREE.MeshLambertMaterial({ color: new THREE.Color(FILL[b]).lerp(new THREE.Color('#efb54d'), 0.5) }));
	}
	const plotMeshes: THREE.Mesh[] = [];
	for (const plot of map.plots) {
		const shape = new THREE.Shape(plot.outline.map(([x, y]) => new THREE.Vector2(X(x), Z(y))));
		const g = keep(new THREE.ExtrudeGeometry(shape, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 1.2, bevelSegments: 2, curveSegments: 1 }));
		g.rotateX(Math.PI / 2);
		const m = new THREE.Mesh(g, plain[plot.biome]);
		m.position.y = PLOT_TOP - 0.6;
		m.receiveShadow = true;
		m.userData.plot = plot;
		plotMeshes.push(m);
		scene.add(m);
	}
	const ringMat = keep(new THREE.MeshBasicMaterial({ color: '#d99a2b', side: THREE.DoubleSide }));
	let ring: THREE.Mesh | null = null;

	// ── what stands on the land ──
	const footAt = (f: Feature) => (f.plot ? PLOT_TOP : ground(f.x, f.y)) - 0.2;
	addFeatures(scene, map.features, footAt, X, Z, keep);

	// ── the city view: its domes, towers and trees, grown the first time it is shown ──
	let city: THREE.Group | null = null;
	const showCity = (on: boolean) => {
		if (on && !city) {
			city = new THREE.Group();
			const built = buildCity(map);
			const stone = keep(new THREE.MeshLambertMaterial({ color: '#eadfc8', flatShading: true }));
			const glass = keep(new THREE.MeshLambertMaterial({ color: '#cfe4e8', flatShading: true }));
			// every dome on its ring of stone arches; the tower a bell (the legacy Tower180 profile, shape 1: 180 m foot and height)
			const ring = keep(new THREE.CylinderGeometry(1.06, 1.12, 1, 18).translate(0, 0.5, 0));
			const cap = keep(new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2));
			const profile = new THREE.SplineCurve(
				[[90, 0], [90, 7], [85, 27.5], [70, 50.4], [54, 73.4], [44, 100.9], [38, 128.4], [34, 149], [27, 166], [15, 176.5], [0, 180]].map(([a, b]) => new THREE.Vector2(a / 90, b / 90))
			).getPoints(48);
			const bell = keep(new THREE.LatheGeometry(profile.map((v) => new THREE.Vector2(Math.max(0.01, v.x), v.y)), 18));
			const base = (r: number) => Math.max(1.2, r * 0.14);
			const o = new THREE.Object3D();
			const place = (geo: THREE.BufferGeometry, mat: THREE.Material, list: typeof built.domes, lift: boolean, scaleY: (r: number) => number) => {
				const mesh = new THREE.InstancedMesh(geo, mat, list.length);
				list.forEach((d, i) => {
					o.position.set(X(d.x), PLOT_TOP + (lift ? base(d.r) : 0), Z(d.y));
					o.scale.set(d.r, scaleY(d.r), d.r);
					o.updateMatrix();
					mesh.setMatrixAt(i, o.matrix);
				});
				mesh.castShadow = mesh.receiveShadow = true;
				city!.add(mesh);
				keep({ dispose: () => mesh.dispose() });
			};
			place(ring, stone, built.domes, false, base);
			place(cap, glass, built.domes.filter((d) => d.kind !== 'tower'), true, (r) => r);
			place(bell, glass, built.domes.filter((d) => d.kind === 'tower'), true, (r) => r);
			// the city's trees cast no shadow: there are a few hundred thousand of them
			addFeatures(city, [...built.trees, ...built.jungle], footAt, X, Z, keep, false);
			scene.add(city);
		}
		if (city) city.visible = on;
	};

	// ── the camera, held over the map ──
	const controls = new MapControls(camera, canvas);
	controls.enabled = !film;
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.minPolarAngle = 0.3;
	controls.maxPolarAngle = 1.22;
	controls.minDistance = 110;
	controls.maxDistance = 5200;
	controls.zoomToCursor = true;
	controls.screenSpacePanning = false;
	const held = new THREE.Vector3();
	controls.addEventListener('change', () => {
		held.set(THREE.MathUtils.clamp(controls.target.x, -W / 2, W / 2), 0, THREE.MathUtils.clamp(controls.target.z, -H / 2, H / 2)).sub(controls.target);
		held.y = -controls.target.y;
		if (held.lengthSq() > 0) {
			controls.target.add(held);
			camera.position.add(held);
		}
	});

	const resize = () => {
		const w = canvas.clientWidth, h = canvas.clientHeight;
		renderer.setSize(w, h, false);
		camera.aspect = w / Math.max(1, h);
		camera.updateProjectionMatrix();
	};
	const observer = new ResizeObserver(resize);
	observer.observe(canvas);
	resize();

	// ── pointing at and picking plots ──
	const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
	const plotAt = (e: PointerEvent): Plot | null => {
		const r = canvas.getBoundingClientRect();
		ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		ray.setFromCamera(ndc, camera);
		return (ray.intersectObjects(plotMeshes, false)[0]?.object.userData.plot as Plot) ?? null;
	};
	let downAt: { x: number; y: number } | null = null, hovered: Plot | null = null, picked: number | null = null;
	const paint = () => {
		for (const m of plotMeshes) {
			const p = m.userData.plot as Plot;
			m.material = p.id === picked ? lit[p.biome] : p.id === hovered?.id ? warm[p.biome] : plain[p.biome];
		}
	};
	const down = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
	const up = (e: PointerEvent) => {
		if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 6 && e.button === 0) on.pick(plotAt(e));
		downAt = null;
	};
	let pending: PointerEvent | null = null;
	const move = (e: PointerEvent) => {
		if (e.pointerType !== 'mouse' || e.buttons) return;
		pending = e;
	};
	const leave = () => {
		pending = null;
		if (hovered) {
			hovered = null;
			paint();
			on.hover(null);
		}
	};
	canvas.addEventListener('pointerdown', down);
	canvas.addEventListener('pointerup', up);
	canvas.addEventListener('pointermove', move);
	canvas.addEventListener('pointerleave', leave);

	if (!film) renderer.setAnimationLoop(() => {
		if (pending) {
			const p = plotAt(pending);
			pending = null;
			if (p?.id !== hovered?.id) {
				hovered = p;
				paint();
				on.hover(p);
			}
		}
		controls.update();
		followSun();
		renderer.render(scene, camera);
	});

	return {
		city: showCity,
		frame(eye, at, fov) {
			controls.target.set(at[0], at[1] ?? 0, at[2]);
			camera.position.set(eye[0], eye[1], eye[2]);
			camera.fov = fov;
			// near enough for a camera among the domes, no nearer than it needs (depth precision far off)
			camera.near = THREE.MathUtils.clamp((eye[1] - ground(eye[0] + W / 2, eye[2] + H / 2)) / 25, 1, 10);
			camera.updateProjectionMatrix();
			camera.lookAt(controls.target);
			followSun(true);
			renderer.render(scene, camera);
		},
		select(id) {
			picked = id;
			paint();
			if (ring) {
				scene.remove(ring);
				ring.geometry.dispose();
				ring = null;
			}
			const plot = map.plots.find((p) => p.id === id);
			if (plot) {
				const pts = plot.outline.map(([x, y]) => new THREE.Vector3(X(x), 0, Z(y)));
				ring = new THREE.Mesh(ribbon(pts, 2.6, PLOT_TOP + 0.25, true), ringMat);
				scene.add(ring);
			}
		},
		dispose() {
			renderer.setAnimationLoop(null);
			observer.disconnect();
			canvas.removeEventListener('pointerdown', down);
			canvas.removeEventListener('pointerup', up);
			canvas.removeEventListener('pointermove', move);
			canvas.removeEventListener('pointerleave', leave);
			controls.dispose();
			ring?.geometry.dispose();
			for (const x of owned) x.dispose();
			renderer.dispose();
		}
	};
}

/** a flat band of a given width along a line of points (their x and z), at height y */
function ribbon(pts: THREE.Vector3[], width: number, y: number, closed: boolean): THREE.BufferGeometry {
	const n = pts.length, pos: number[] = [], idx: number[] = [];
	for (let i = 0; i < n; i++) {
		const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
		let tx = b.x - a.x, tz = b.z - a.z;
		const l = Math.hypot(tx, tz) || 1;
		tx /= l;
		tz /= l;
		const p = pts[i], h = width / 2;
		pos.push(p.x - tz * h, y, p.z + tx * h, p.x + tz * h, y, p.z - tx * h);
	}
	const segs = closed ? n : n - 1;
	for (let i = 0; i < segs; i++) {
		const a = 2 * i, b = 2 * ((i + 1) % n);
		idx.push(a, b, a + 1, a + 1, b, b + 1);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	const nrm = g.attributes.normal;
	for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0);
	return g;
}

/** a lake's ring moved outward by d metres (the ring runs clockwise on the map, so outward is to its left) */
function offsetRing(ring: P[], d: number): P[] {
	if (!d) return ring;
	const n = ring.length;
	return ring.map((p, i) => {
		const [ax, ay] = ring[(i - 1 + n) % n], [bx, by] = ring[(i + 1) % n];
		const l = Math.hypot(bx - ax, by - ay) || 1;
		return [p[0] + ((by - ay) / l) * d, p[1] - ((bx - ax) / l) * d];
	});
}

/** each kind of feature as one or two instanced meshes (crown and trunk) */
function addFeatures(
	scene: THREE.Object3D,
	features: Feature[],
	footAt: (f: Feature) => number,
	X: (x: number) => number,
	Z: (y: number) => number,
	keep: <T extends { dispose(): void }>(x: T) => T,
	shadows = true
) {
	const at = (g: THREE.BufferGeometry, y: number) => keep(g.translate(0, y, 0));
	const trunkMat = keep(new THREE.MeshLambertMaterial({ color: '#6b4f36' }));
	const kinds: Record<FeatureKind, { parts: [THREE.BufferGeometry, string | null][]; flat?: boolean }> = {
		conifer: { parts: [[at(new THREE.ConeGeometry(3.4, 14, 7), 9), '#3d5b47'], [at(new THREE.CylinderGeometry(0.45, 0.6, 3, 5), 1.5), null]] },
		broadleaf: { parts: [[at(new THREE.IcosahedronGeometry(4.6, 0), 8.5), '#6f8b5c'], [at(new THREE.CylinderGeometry(0.5, 0.7, 6, 5), 3), null]] },
		willow: { parts: [[at(new THREE.IcosahedronGeometry(4.8, 0), 8), '#88a26b'], [at(new THREE.CylinderGeometry(0.5, 0.7, 6, 5), 3), null]] },
		cypress: { parts: [[at(new THREE.ConeGeometry(1.8, 13, 6), 7.5), '#2c4035'], [at(new THREE.CylinderGeometry(0.3, 0.4, 1.5, 5), 0.75), null]] },
		stone: { parts: [[at(new THREE.DodecahedronGeometry(1.6, 0).scale(1, 0.65, 1), 0.5), '#bdb5a6']] },
		spire: { parts: [[at(new THREE.CylinderGeometry(0.55, 1, 1, 5), 0.5), '#c97850']], flat: true },
		peak: { parts: [[at(new THREE.ConeGeometry(1, 1, 6), 0.5), '#c8c0b1']], flat: true }
	};
	const byKind = new Map<FeatureKind, Feature[]>();
	for (const f of features) (byKind.get(f.kind) ?? byKind.set(f.kind, []).get(f.kind)!).push(f);
	const o = new THREE.Object3D(), c = new THREE.Color();
	for (const [kind, list] of byKind) {
		for (const [geo, colour] of kinds[kind].parts) {
			const mat = colour ? keep(new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true })) : trunkMat;
			const mesh = new THREE.InstancedMesh(geo, mat, list.length);
			list.forEach((f, i) => {
				o.position.set(X(f.x), footAt(f), Z(f.y));
				o.rotation.set(0, f.turn, 0);
				if (f.h && f.w) o.scale.set(f.w / 2, f.h, f.w / 2);
				else o.scale.setScalar(f.s);
				o.updateMatrix();
				mesh.setMatrixAt(i, o.matrix);
				if (colour) mesh.setColorAt(i, c.set(colour).multiplyScalar(0.88 + ((f.turn * 1000) % 1) * 0.22));
			});
			mesh.castShadow = shadows;
			mesh.receiveShadow = !!kinds[kind].flat;
			scene.add(mesh);
			keep({ dispose: () => mesh.dispose() });
		}
	}
}
