/*
 * SAMUEL — Samuel's own character (intent a4f8dc85), private to him: his face fitted to his photos (MakeHuman's CC0
 * head and face targets against MediaPipe's landmarks on his front and three-quarter photos and the skull's outline on
 * his sheet's head cells; tools/character), baked into the Person head v2's own-face inputs, on the shared Person body,
 * skeleton and motion. Everything here is data: his look, his height, his face's shape and colours; the rig, skin and
 * motion are the pieces'.
 * Bald, a full trimmed reddish-brown beard (in his face's colours), light blue-grey eyes, 1.69 m; cream linen (the
 * Person body v3's `wear`).
 */
const BODY = require('d9a46c9bef4be1ae8679c144ef4fcad5cd1b5f01882d4ddc306b8aa51bd35927');
const MOTION = require('16dadf0099be9638315e10bf913916253a824c32f215ef6bfa7c5e3252fd2d3f');
const GAIT = require('e1c0a220afd1949475d88210214ad813e17e6a054406f0a96a798964292e4831');
const ACTIONS = require('5ce51f9e5126cb38ef44ddbe205b359e0917da6774d28ac1e7931797365004ce');

/** his face: offsets of the Person head's base vertices (Int16, 1e-5 m) and his smoothed skin's colours (sRGB bytes) */
const FACE = __FACE__;

const LOOK = {
	face: 'man',
	hair: 'none',
	skin: '#e2b49c',
	brows: '#8a5233',
	lips: '#b8766a',
	iris: '#7d93a2',
	hairColour: '#9a5f38',
	shirt: '#e8e0d0',
	trousers: '#e3dac8',
	belt: '#d8ceba',
	shoes: '#6b4a32',
	soles: '#4a3324',
	// his clothes: a cream linen band-collar shirt, long-sleeved, worn open at the collar and untucked to the upper
	// hip; loose cream linen trousers to the ankle; brown leather sandals with two straps (measured for 1.80 m)
	wear: {
		shirt: { sleeve: 'long', hem: .93, placket: .06, ease: 1.06 },
		trousers: { ankle: .1, ease: 1.12 },
		shoes: 'sandals'
	}
};
const PARAMS = [
	{ id: 'height', label: 'Height (m)', type: 'number', min: 1.6, max: 1.8, step: 0.01, value: 1.69 },
	{ id: 'detail', label: 'Detail', type: 'number', min: 0.05, max: 1, step: 0.01, value: 1 }
];

function samuel(height = 1.69, detail = 1) {
	const look = { ...LOOK, shape: FACE.shape, colours: FACE.colours };
	const make = () => BODY.person(look, height, { v: 10 });
	const build = detail < 1 ? BODY.lowDetail(make, Math.max(0.05, detail)) : make();
	build.rig.object.name = 'samuel';
	const m = MOTION.moves(build, { gait: GAIT, actions: ACTIONS, gears: { walk: 1.4, run: 3 }, strides: { walk: 1.5, run: 2.3 } });
	return { rig: build.rig, clips: m.clips, gears: m.gears, poses: build.poses, first: 'idle' };
}

module.exports.recipe = function (id, v, variant) {
	return {
		meta: {
			group: 'characters',
			id: 'samuel',
			version: v,
			variant: 'samuel',
			label: 'Samuel',
			note: "Samuel's own character, 1.69 m: his face from his photos on the shared person",
			params: PARAMS
		},
		build: samuel
	};
};
