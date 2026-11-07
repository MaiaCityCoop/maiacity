//#region src/lib/assets/kit.js
const LAYER_FX = 1;
//#piece 10034cfedefbb926546891549657d823258317f7f32a9fefe58d59d8a54a2f64
const smoothstep = (a, b, x) => {
	const t = clamp((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};
