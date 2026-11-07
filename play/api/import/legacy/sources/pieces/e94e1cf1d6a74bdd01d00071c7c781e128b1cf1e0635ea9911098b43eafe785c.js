//#region src/lib/actors/species/songbird.js
/** @typedef {import('../rig').V3} V3 */
/** @typedef {import('../rig').Pose} Pose */
/** @typedef {import('../rig').PartSpec} PartSpec */
/** @typedef {import('../rig').Cast} Cast */
/** @typedef {import('../sculpt').Surface} Surface */
/** @typedef {'robin' | 'blackbird' | 'greattit' | 'sparrow' | 'chaffinch'} Songbird */
/** @type {Songbird[]} */
const SONGBIRDS = [
	"robin",
	"blackbird",
	"greattit",
	"sparrow",
	"chaffinch"
];
/**
* Each bird: its size against a robin's, its bill (length, thickness at the root, colour), its legs' colour, its
* eye-ring, and how it is coloured (`paint`).
* @type {Record<Songbird, { k: number, bill: [number, number, string], legs: string, ring?: string, wing: string, bars?: string, tail: string }>}
