//#piece dd3302da6e23feaabceee9e5a0470be5d09a1d86d97df3b5d9b3f7b905747aed
* @typedef {{ stem: [string, string], stalk: string, green: string, ripe: string, tip: string, fingers: [number, number], length: number, girth: number, hands: number }} Look
*   — a banana's colours (its pseudostem's two greens or reds, its leaf stalks, its fruit green and ripe), how many
*   fingers to a hand, how long and thick they are, how many hands to a bunch
*/
/** the red banana's stages: as the banana's, its colours its own */
const RED_BANANA_STAGES = /* @__PURE__ */ (() => BANANA_STAGES.map((st, k) => ({
	...st,
	day: Math.round(st.day * 1.08),
	note: [
		"A red sucker cut from its mother’s corm, its narrow leaves upright, set in the soil.",
		st.note,
		st.note,
		"A pseudostem of rolled sheaths, flushed red-purple; red leaf stalks and midribs.",
		"Three metres of dark red pseudostem, a crown of huge leaves with red midribs, torn by the wind.",
		st.note,
		"Bract after bract lifts, baring hands of short thick fingers, maroon from the start.",
		"The fingers fill out, plump and dark red.",
		"Full and rounded, the maroon lightening toward a dusky purple-red.",
		"A heavy bunch of red bananas, sweet with a hint of raspberry; beside it the next sucker."
	][k]
})))();
/** the red banana (Red Dacca): its pseudostem, leaf stalks and midribs flushed red-purple, its fruit maroon turning a dusky purple-red, short and thick */
/** @type {Look} */
const RED = {
	stem: ["#7a3a4a", "#5a2a3a"],
	stalk: "#8a3a4a",
	green: "#6a2a3a",
	ripe: "#a8303a",
	tip: "#2a1a1a",
	fingers: [12, 16],
	length: .16,
	girth: .025,
	hands: 8
};
/**
* The red banana at a stage (0 … 9) from the seed id.
* @param {number} g
* @param {string} seed
*/
const redBanana = (g, seed) => grow(RED, g, seed);
//#piece cea9e5caf85af5e2a61b8b0a9b16852ca08478f7a4ca115729612829647fe978
	id: "red-banana",
	label: "Red banana",
	latin: "Musa acuminata 'Red Dacca' · Rote Banane",
	note: "The banana’s red sister: its pseudostem, leaf stalks and midribs flushed red-purple, short thick fingers ripening maroon to a dusky purple-red.",
	from: "Herb · 14 months",
	stages: RED_BANANA_STAGES,
	grow: redBanana
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160
