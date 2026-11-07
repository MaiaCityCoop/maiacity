/*
 * ELDER WOMAN — the third settler (Trailer 3): an older woman of 1.64 m, warm blonde hair with darker roots in a bun,
 * a friendly gaze, her skin's fine lines; built on the shared pieces every person stands on (the VRM humanoid
 * skeleton under one skin, MakeHuman's CC0 head) and moving by motion capture with an elder's gait: a woman's walk
 * from ACCAD's Open Motion Project (CC BY 3.0) at an older woman's step and pace (about 0.55 m a step, 0.95 m/s:
 * slower and shorter than the stand-in's 0.75 m and 1.4 m/s), with half of 100STYLE's "Old" stoop (CC BY 4.0) laid
 * over her back; her idle and her hurried shuffle are 100STYLE's Old style eased half way upright. Her sit, wave and
 * pick up are everyone's. Each foot is put down by the actors' one IK and held there.
 *
 * Credits (CC BY): ACCAD, The Ohio State University, Open Motion Project (CC BY 3.0); Ian Mason, Sebastian Starke,
 * Taku Komura, 100STYLE (CC BY 4.0, doi:10.1145/3522618). CC0: Quaternius; MakeHuman.
 */
const THREE = require('three');
const BODY = require('bd01f7ace1a24e16af3195fe7c33fca6c28d416852d0314a73a620c9bc6da2e9');
const MOTION = require('51e2cc215edd217474bf8898ae38ce8a5cae8fcb2e00ba0bd5dd3d7efb28f0c3');
const GAIT = require('37b3be2838d55b19cfc15d46d9660646553a64d5f0aed600cfa5607d8908d6f0');
const ACTIONS = require('6a252e13b7fa26071650e300d87eac43b29ce5caf4788ddd45a0b9fa84448aa0');

/** how she looks (v2's) */
const LOOK = {
	face: 'woman',
	skin: '#ead1bb',
	hair: 'bun',
	hairColour: '#ded3b1',
	brows: '#b7aa8c',
	iris: '#73909a',
	lips: '#ae8079',
	shirt: '#71965b',
	trousers: '#59544d'
};
const HEIGHT = 1.64;
const PARAMS = [
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.01, value: 1 },
	{ id: 'slope', label: 'Ground slope (°, for checking)', type: 'number', min: -20, max: 20, step: 1, value: 0 },
	{ id: 'step', label: 'Stairs, each step (m, for checking)', type: 'number', min: 0, max: 0.2, step: 0.01, value: 0 }
];

/** her face's fine lines (v2's): the skin a shade darker along two lines under each eye and from the nose down */
function lines(object) {
	object.traverse((o) => {
		const g = o.geometry, P = g?.getAttribute('position'), C = g?.getAttribute('color'), N = g?.getAttribute('normal');
		if (!P || !C || !N) return;
		const s = HEIGHT / 1.64;
		for (let i = 0; i < P.count; i++) {
			const x = P.getX(i) / s, y = P.getY(i) / s;
			if (P.getZ(i) / s < 0.025 || N.getZ(i) < 0.4 || Math.abs(x) > 0.065 || y < 1.43 || y > 1.59) continue;
			const eyes = Math.exp(-(((y - 1.56) / 0.002) ** 2)) + 0.7 * Math.exp(-(((y - 1.575) / 0.002) ** 2));
			const cheeks = Math.exp(-(((Math.abs(x) - (0.025 + (1.5 - y) * 0.45)) / 0.002) ** 2)) * Math.exp(-(((y - 1.48) / 0.025) ** 2));
			const k = 1 - Math.min(0.15, 0.1 * eyes + 0.08 * cheeks);
			C.setXYZ(i, C.getX(i) * k, C.getY(i) * k, C.getZ(i) * k);
		}
		C.needsUpdate = true;
	});
}
/** her hair (v2's): warm blonde over darker roots, a swept side part and sculpted locks standing off the head */
function hair(object) {
	const mesh = object.isMesh ? object : null;
	const g = (mesh ?? object.children.find((c) => c.isMesh))?.geometry;
	if (!g) return;
	const P = g.getAttribute('position'), N = g.getAttribute('normal'), C = g.getAttribute('color');
	const was = new THREE.Color(LOOK.hairColour), roots = new THREE.Color('#8b7148'), mid = new THREE.Color('#cfb780'), light = new THREE.Color('#dfc991'), c = new THREE.Color();
	for (let i = 0; i < P.count; i++) {
		if (Math.abs(C.getX(i) - was.r) + Math.abs(C.getY(i) - was.g) + Math.abs(C.getZ(i) - was.b) > 0.012 || P.getY(i) < 1.48) continue;
		const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
		const top = THREE.MathUtils.smoothstep(y, 1.55, 1.64);
		const across = x + 0.26 * (z - 0.015) + 0.025;
		const lock = 0.5 + 0.5 * Math.sin(across * 620 + z * 35);
		const fine = 0.5 + 0.5 * Math.sin(across * 1900 + z * 91);
		const part = Math.exp(-((across / 0.0032) ** 2));
		const lift = (8e-4 + 0.011 * top + 4e-4 * lock * top) * (1 - 0.65 * part);
		P.setXYZ(i, x + N.getX(i) * lift, y + N.getY(i) * lift, z + N.getZ(i) * lift);
		c.copy(roots).lerp(mid, 0.5 + 0.32 * lock).lerp(light, 0.12 * fine);
		c.lerp(roots, 0.55 * part);
		C.setXYZ(i, c.r, c.g, c.b);
	}
	P.needsUpdate = C.needsUpdate = true;
	g.computeBoundingBox();
	g.computeBoundingSphere();
}

function elderWoman(detail = 1, slope = 0, step = 0) {
	const make = () => BODY.person(LOOK, HEIGHT, { v: 10 });
	const build = detail < 1 ? BODY.lowDetail(make, Math.max(0.05, detail)) : make();
	lines(build.rig.object);
	hair(build.rig.object);
	build.rig.object.name = 'elder-woman';
	const m = MOTION.moves(build, { gait: GAIT, actions: ACTIONS, gears: { walk: 0.95, run: 1.5 }, strides: { walk: 1.1, run: 1.3 }, ground: { slope: Number(slope), step: Number(step) } });
	return { rig: build.rig, clips: m.clips, gears: m.gears, poses: build.poses, first: 'idle' };
}

module.exports.recipe = function (id, v, variant) {
	return {
		meta: {
			group: 'actors',
			id: 'elder-woman',
			version: v,
			variant: 'elder-woman',
			label: 'Elder woman: Third settler',
			note: 'Trailer 3: an older woman of 1.64 m on the VRM humanoid skeleton, an elder\'s gait from motion capture',
			params: PARAMS
		},
		build: elderWoman
	};
};
