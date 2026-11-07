/*
 * A PERSON'S SKELETON — the VRM 1.0 humanoid bone set (vrm-c, "VRM humanoid", the open standard avatars are made to and
 * motion is retargeted onto): hips, spine, chest, upperChest, neck, head; each side's shoulder (the clavicle),
 * upperArm, lowerArm, hand and fifteen finger bones (thumb metacarpal, proximal, distal; index, middle, ring and little
 * proximal, intermediate, distal); each side's upperLeg, lowerLeg, foot and toes. 52 bones, named as the standard
 * names them, every one where it sits in a person of 1.80 m to the crown (m, y up, the front towards +z, the
 * person's left towards +x), turned not at all at rest: a pose turns each from there.
 */
const SIDES = [
	['left', 1],
	['right', -1]
];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
/** the fingers: each one's joints from its knuckle down (x across from the hand's middle, y, z), its tip last */
const FINGERS = {
	thumb: { bones: ['Metacarpal', 'Proximal', 'Distal'], at: [[-0.005, 0.902, 0.022], [-0.01, 0.872, 0.042], [-0.014, 0.847, 0.055]], tip: [-0.017, 0.826, 0.064], r: 0.0105 },
	index: { bones: ['Proximal', 'Intermediate', 'Distal'], at: [[0, 0.822, 0.026], [0, 0.781, 0.028], [0, 0.756, 0.028]], tip: [0, 0.734, 0.027], r: 0.0088 },
	middle: { bones: ['Proximal', 'Intermediate', 'Distal'], at: [[0.001, 0.818, 0.007], [0.001, 0.773, 0.007], [0.001, 0.745, 0.007]], tip: [0.001, 0.721, 0.007], r: 0.009 },
	ring: { bones: ['Proximal', 'Intermediate', 'Distal'], at: [[0, 0.822, -0.012], [0, 0.78, -0.013], [0, 0.754, -0.013]], tip: [0, 0.732, -0.013], r: 0.0085 },
	little: { bones: ['Proximal', 'Intermediate', 'Distal'], at: [[-0.002, 0.83, -0.029], [-0.002, 0.797, -0.031], [-0.002, 0.777, -0.031]], tip: [-0.002, 0.76, -0.031], r: 0.0075 }
};
/** the hand's middle across (x), where its fingers hang from */
const HAND_X = 0.207;
function bones() {
	const out = [
		{ name: 'hips', at: [0, 0.98, 0] },
		{ name: 'spine', parent: 'hips', at: [0, 1.1, -0.01] },
		{ name: 'chest', parent: 'spine', at: [0, 1.22, -0.012] },
		{ name: 'upperChest', parent: 'chest', at: [0, 1.34, -0.014] },
		{ name: 'neck', parent: 'upperChest', at: [0, 1.52, -0.015] },
		{ name: 'head', parent: 'neck', at: [0, 1.62, 0] }
	];
	for (const [s, x] of SIDES) {
		out.push(
			{ name: `${s}Shoulder`, parent: 'upperChest', at: [x * 0.035, 1.455, 0.005] },
			{ name: `${s}UpperArm`, parent: `${s}Shoulder`, at: [x * 0.19, 1.45, -0.01] },
			{ name: `${s}LowerArm`, parent: `${s}UpperArm`, at: [x * 0.2, 1.17, -0.02] },
			{ name: `${s}Hand`, parent: `${s}LowerArm`, at: [x * 0.205, 0.915, 0] }
		);
		for (const [f, d] of Object.entries(FINGERS))
			d.bones.forEach((b, k) => out.push({ name: `${s}${cap(f)}${b}`, parent: k ? `${s}${cap(f)}${d.bones[k - 1]}` : `${s}Hand`, at: [x * (HAND_X + d.at[k][0]), d.at[k][1], d.at[k][2]] }));
		out.push(
			{ name: `${s}UpperLeg`, parent: 'hips', at: [x * 0.095, 0.93, 0] },
			{ name: `${s}LowerLeg`, parent: `${s}UpperLeg`, at: [x * 0.1, 0.5, 0.01] },
			{ name: `${s}Foot`, parent: `${s}LowerLeg`, at: [x * 0.1, 0.085, -0.005] },
			{ name: `${s}Toes`, parent: `${s}Foot`, at: [x * 0.1, 0.022, 0.135] }
		);
	}
	return out;
}
/** where each finger and toe ends (no bone there): its tip */
function tips() {
	const out = { head: [0, 1.82, 0.01] };
	for (const [s, x] of SIDES) {
		for (const [f, d] of Object.entries(FINGERS)) out[`${s}${cap(f)}${d.bones[2]}`] = [x * (HAND_X + d.tip[0]), d.tip[1], d.tip[2]];
		out[`${s}Toes`] = [x * 0.1, 0.02, 0.205];
	}
	return out;
}
module.exports = { SIDES, FINGERS, HAND_X, bones, tips, cap };
