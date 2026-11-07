/*
 * STAND-IN — a person of 1.70 m (any height, 1.0 to 2.2 m), the one a shot is blocked with, built on the shared
 * pieces every person stands on: the VRM humanoid skeleton (52 bones: spine in four, clavicles, fingers, toes) under
 * one skin, MakeHuman's CC0 head with its friendly gaze, and motion capture, never hand-drawn motion: walk and run
 * from ACCAD's Open Motion Project (CC BY 3.0), idle from 100STYLE (CC BY 4.0), sit down and stand up from Quaternius'
 * Universal Animation Library (CC0), each foot put down by the actors' one IK and held there. Walk and run are one
 * move blended by speed (idle ↔ walk ↔ run, 0 to about 3 m/s) and played by the distance walked.
 *
 * Credits (CC BY): ACCAD, The Ohio State University, Open Motion Project (CC BY 3.0); Ian Mason, Sebastian Starke,
 * Taku Komura, 100STYLE (CC BY 4.0, doi:10.1145/3522618). CC0: Quaternius; MakeHuman.
 */
const BODY = require('7f8cae20147242dbe6ee2eafe0203c1f59f0cd3925bca7135b70667137888cf2');
const MOTION = require('51e2cc215edd217474bf8898ae38ce8a5cae8fcb2e00ba0bd5dd3d7efb28f0c3');
const GAIT = require('e1c0a220afd1949475d88210214ad813e17e6a054406f0a96a798964292e4831');
const ACTIONS = require('5ce51f9e5126cb38ef44ddbe205b359e0917da6774d28ac1e7931797365004ce');

const LOOK_LABELS = {
	skin: 'Skin',
	brows: 'Brows',
	shirt: 'T-shirt',
	trousers: 'Jeans',
	belt: 'Belt',
	shoes: 'Trainers',
	soles: 'Soles',
	hair: 'Hair (none, short, long, bun)',
	hairColour: 'Hair colour',
	iris: 'Eyes',
	lips: 'Lips',
	face: 'Face (man, woman)'
};
const LOOK_KEYS = Object.keys(BODY.LOOK);
const HAIRS = ['none', 'short', 'long', 'bun'];
const PARAMS = [
	{ id: 'height', label: 'Height (m)', type: 'number', min: 1, max: 2.2, step: 0.01, value: 1.7 },
	...LOOK_KEYS.map((k) => ({ id: k, label: LOOK_LABELS[k], type: 'string', value: BODY.LOOK[k], maxLength: k === 'hair' || k === 'face' ? 8 : 16 })),
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.01, value: 1 },
	{ id: 'slope', label: 'Ground slope (°, for checking)', type: 'number', min: -20, max: 20, step: 1, value: 0 },
	{ id: 'step', label: 'Stairs, each step (m, for checking)', type: 'number', min: 0, max: 0.2, step: 0.01, value: 0 }
];

/** a look from the parameters after the height, in LOOK's order: a hair or a face it does not know is LOOK's */
function lookOf(given) {
	const out = {};
	LOOK_KEYS.forEach((k, i) => given[i] !== undefined && (out[k] = String(given[i])));
	if (out.hair !== undefined && !HAIRS.includes(out.hair)) delete out.hair;
	if (out.face !== undefined && out.face !== 'man' && out.face !== 'woman') delete out.face;
	return out;
}

/** the ground it is checked on: a ramp or stairs under it, drawn (only when asked for) */
function groundOf(THREE, slope, step, stairs) {
	if (!slope && !step) return null;
	const g = new THREE.Group();
	const mat = new THREE.MeshStandardMaterial({ color: '#b9b2a6', roughness: 0.95 });
	if (step && stairs) {
		// the stairs the motion walks up: tread k centred at origin + k · going, rising `step` each
		const { origin, going } = stairs;
		for (let k = 0; k < 24; k++) {
			const top = step * (k + 1), from = origin + (k - 0.5) * going;
			const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, top + 0.2, going), mat);
			box.position.set(0, top / 2 - 0.1, from + going / 2);
			box.receiveShadow = true;
			g.add(box);
		}
	} else if (slope) {
		const len = 30, a = Math.atan(Math.tan((slope * Math.PI) / 180));
		const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, len), mat);
		ramp.rotation.x = -a;
		ramp.position.set(0, Math.tan(a) * (len / 2 - 2) - 0.05 / Math.cos(a), len / 2 - 2);
		ramp.receiveShadow = true;
		g.add(ramp);
	}
	g.name = 'ground (for checking)';
	return g;
}

function standIn(height = 1.7, ...rest) {
	const look = lookOf(rest.slice(0, LOOK_KEYS.length));
	const [detail = 1, slope = 0, step = 0] = rest.slice(LOOK_KEYS.length).map(Number);
	const make = () => BODY.person(look, height, { v: 10 });
	const build = detail < 1 ? BODY.lowDetail(make, Math.max(0.05, detail)) : make();
	build.rig.object.name = 'stand-in';
	const m = MOTION.moves(build, { gait: GAIT, actions: ACTIONS, gears: { walk: 1.4, run: 3 }, strides: { walk: 1.5, run: 2.3 }, ground: { slope, step } });
	const ground = groundOf(require('three'), slope, step, m.stairs);
	if (ground) build.rig.object.add(ground);
	return { rig: build.rig, clips: m.clips, gears: m.gears, poses: build.poses, first: 'idle' };
}

module.exports.recipe = function (id, v, variant) {
	return {
		meta: {
			group: 'actors',
			id: 'stand-in',
			version: v,
			variant: 'stand-in',
			label: 'Stand-in: Stand-in',
			note: 'a person of 1.70 m on the VRM humanoid skeleton, moving by motion capture, feet planted by IK',
			params: PARAMS
		},
		build: standIn
	};
};
