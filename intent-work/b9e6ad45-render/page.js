// The people of intent b9e6ad45 drawn on the GPU (Metal, on the Mac) beside the motion capture they were made from:
// each person built from tools/motion's mirror of what the intent proposes (its pieces held by their hashes), posed by
// every clip as play's box poses it (cast.clips[name](t, m), rig.pose), skinned by the body's own dual-quaternion
// shader; beside it the recorded skeleton (tools/motion/sources: the source's own joints, at the person's size).
// Four panels: the person from the front, the recording from the front, the person from the side, the recording from
// the side. render.mjs drives it: window.setup(who), window.frame(clip, t) → a JPEG data URL.
import * as THREE from '/play/site/node_modules/three/build/three.module.js';
import * as BGU from '/play/site/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
import * as RBG from '/play/site/node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as SKU from '/play/site/node_modules/three/examples/jsm/utils/SkeletonUtils.js';

const M = '/tools/motion/';
const addons = { 'three/addons/utils/BufferGeometryUtils.js': BGU, 'three/addons/geometries/RoundedBoxGeometry.js': RBG, 'three/addons/utils/SkeletonUtils.js': SKU };
const text = async (p) => (await fetch(p)).text();
const W = 1600, H = 900, PW = W / 4;
const SETS = { 'stand-in': 'man', 'elder-woman': 'elder' };
const NAMES = { 'stand-in': 'Stand-in v14', 'elder-woman': 'Elder woman v5' };
let cast, plan, sources, sticks, stickGeo, renderer, scene, stage, label, height = 1.7;

async function loadSources(set) {
	const blob = await (await fetch(`${M}sources/${set}.json.gz`)).blob();
	return JSON.parse(await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text());
}

window.setup = async (who) => {
	const proposed = JSON.parse(await text(`${M}proposed.json`)).files;
	const byHash = {};
	for (const [f, h] of Object.entries(proposed)) if (f.startsWith('pieces/')) byHash[h] = await text(M + f);
	const loaded = {};
	const run = (code, name) => {
		const module = { exports: {} };
		const require = (id) => {
			if (id === 'three') return THREE;
			if (addons[id]) return addons[id];
			if (byHash[id]) return (loaded[id] ??= run(byHash[id], id));
			throw new Error(`${name}: may not require ${id}`);
		};
		new Function('module', 'exports', 'require', code)(module, module.exports, require);
		return module.exports;
	};
	cast = run(await text(`${M}assets/${who}.js`), who).recipe('x', 14, null).build();
	sources = { ...(await loadSources(SETS[who])), ...(await loadSources('actions')) };
	const data = Object.assign({}, run(byHash[proposed[`pieces/clips-${SETS[who]}.js`]], 'gait'), run(byHash[proposed['pieces/clips-actions.js']], 'actions'));
	plan = {};
	for (const name of Object.keys(cast.clips)) {
		const c = data[name];
		plan[name] = { len: c ? Math.max(c.frames - 1, 1) / c.fps : 1.6, speed: cast.gears?.[name] ?? 0, fps: c?.fps ?? 30, kind: c?.kind };
	}
	label = document.createElement('canvas');
	label.width = W;
	label.height = H;
	const lit = (s) => {
		s.background = new THREE.Color('#e9e7e2');
		s.add(new THREE.HemisphereLight('#ffffff', '#8a8378', 1.6));
		const sun = new THREE.DirectionalLight('#ffffff', 2.2);
		sun.position.set(2, 4, 3);
		s.add(sun);
		const grid = new THREE.GridHelper(6, 12, '#b9b3a8', '#d2cdc4');
		s.add(grid);
		return s;
	};
	scene = lit(new THREE.Scene());
	scene.add(cast.rig.object);
	stage = lit(new THREE.Scene());
	stickGeo = new THREE.BufferGeometry();
	sticks = new THREE.LineSegments(stickGeo, new THREE.LineBasicMaterial({ color: '#2b5fa8' }));
	stage.add(sticks);
	cast.rig.object.updateMatrixWorld(true);
	height = new THREE.Box3().setFromObject(cast.rig.object).getSize(new THREE.Vector3()).y;
	document.body.dataset.who = who;
	return { clips: Object.keys(cast.clips), plan, height };
};
/** the GPU, asked for once a frame is drawn (setup alone needs none): its name, to be sure it is the Mac's Metal */
window.gpu = () => {
	renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	renderer.setSize(W, H);
	renderer.setScissorTest(true);
	document.body.appendChild(renderer.domElement);
	const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info');
	return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
};

const cam = new THREE.PerspectiveCamera(30, PW / H, 0.05, 50);
function view(target, side, s) {
	const d = 4.2;
	cam.position.set(target.x + (side ? d : 0), 1.0, target.z + (side ? 0 : d));
	cam.lookAt(target.x, 0.85, target.z);
	renderer.render(s, cam);
}
window.frame = (name, t) => {
	const P = plan[name];
	cast.rig.pose(cast.clips[name](t, { dist: P.speed * t, speed: P.speed }));
	cast.rig.object.updateMatrixWorld(true);
	const hips = new THREE.Vector3().setFromMatrixPosition(cast.rig.bones.hips.matrixWorld);
	// the recording at the same moment: a loop or a cycle round again, once held at its ends
	const s = sources[name];
	let at = null;
	if (s) {
		const n = s.pos.length, x = t * P.fps;
		const i = P.kind === 'cycle' || P.kind === 'loop' ? Math.round(x) % n : Math.min(n - 1, Math.round(x));
		const p = s.pos[i], idx = Object.fromEntries(s.joints.map((j, k) => [j, k]));
		const k = height / 1.8, xyz = [];
		for (const [a, b] of s.lines) for (const j of [a, b]) xyz.push(p[idx[j] * 3] / 1000 * k, p[idx[j] * 3 + 1] / 1000 * k, p[idx[j] * 3 + 2] / 1000 * k);
		stickGeo.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
		stickGeo.computeBoundingSphere();
		// centred between its hips (the hips' line is its first bone's)
		const [r, l] = s.lines[0].map((j) => idx[j]);
		at = new THREE.Vector3(((p[r * 3] + p[l * 3]) / 2000) * k, 0, ((p[r * 3 + 2] + p[l * 3 + 2]) / 2000) * k);
	}
	sticks.visible = !!s;
	const panels = [[scene, hips, false], [stage, at ?? hips, false], [scene, hips, true], [stage, at ?? hips, true]];
	panels.forEach(([sc, target, side], i) => {
		renderer.setViewport(i * PW, 0, PW, H);
		renderer.setScissor(i * PW, 0, PW, H);
		view(target, side, sc);
	});
	const g = label.getContext('2d');
	g.drawImage(renderer.domElement, 0, 0);
	g.fillStyle = '#222';
	g.font = '20px sans-serif';
	const who = NAMES[document.body.dataset.who] ?? '';
	['front', 'front', 'side', 'side'].forEach((v, i) => g.fillText(`${i % 2 ? 'recorded' : who} · ${name} · ${v}`, i * PW + 12, 30));
	g.font = '14px sans-serif';
	g.fillText(`${t.toFixed(2)} s`, 12, 54);
	if (s) g.fillText(s.from.slice(0, 70), PW + 12, 54);
	else g.fillText('(a quarter turn made from the idle: no recording of its own)', PW + 12, 54);
	return label.toDataURL('image/jpeg', 0.82);
};
