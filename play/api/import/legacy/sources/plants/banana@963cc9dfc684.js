//#piece dd3302da6e23feaabceee9e5a0470be5d09a1d86d97df3b5d9b3f7b905747aed
* The banana at a stage (0 … 9, between them on the way) from the seed id.
* @param {number} g
* @param {string} seed
*/
const banana = (g, seed) => grow(YELLOW, g, seed);
/** @type {Look} */
const YELLOW = {
	stem: ["#6f9a3a", "#4f7a2e"],
	stalk: "#6f9a3a",
	green: "#5f8a2e",
	ripe: "#f2d43a",
	tip: "#3a2a1a",
	fingers: [14, 18],
	length: .2,
	girth: .021,
	hands: 10
};
//#piece cea9e5caf85af5e2a61b8b0a9b16852ca08478f7a4ca115729612829647fe978
	id: "banana",
	label: "Banana",
	latin: "Musa acuminata · Banane",
	note: "From a sucker: a pseudostem of rolled leaf sheaths, huge paddle leaves torn by the wind; the flower stalk bends over, purple bracts lift off hands of fingers curving up, the male bud hanging below.",
	from: "Herb · 13 months",
	stages: BANANA_STAGES,
	grow: banana
//#piece 73b53b29da75454a58c6938c205db58b7fc8c161d71c695e8df583eea202f160
