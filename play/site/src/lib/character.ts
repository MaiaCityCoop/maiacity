// Every visitor walks a world as someone new (play/SPEC.md §5): the stand-in actor (actors/stand-in@11) with a look
// drawn at random within what its card takes — face (man, woman), hair (none, short, long, bun), height 1–2.2 m, and
// a colour for skin, brows, hair, eyes, lips, T-shirt, jeans, belt, trainers and soles. Drawn once a page load.

export type Look = Record<string, string>;
export type Character = { height: number; look: Look };

const pick = <T>(r: () => number, list: T[]): T => list[Math.floor(r() * list.length) % list.length];

/** skin tones across the human range, light to deep */
const SKIN = ['#f3d5bf', '#e8b996', '#d6a17c', '#c48a66', '#b07a56', '#9a6a48', '#86573a', '#6e452c', '#563320', '#3e2516'];
/** natural hair colours, and a few dyed */
const HAIR = ['#16110e', '#2b1d14', '#3b2418', '#5a3a22', '#8a5a2b', '#b07a40', '#d1a45f', '#e3c996', '#bdb6ad', '#9a9a9a', '#7a2f2a', '#3d4f7a'];
const EYES = ['#2c1d14', '#4a3020', '#5a4030', '#6b5a2a', '#4a6a8a', '#5a7a5a', '#7a8a9a'];
const LIPS = ['#a8665a', '#9a5a50', '#8a4a40', '#b9776a', '#7e4a3e', '#c48478'];
/** the brand's palette and its neighbours for the clothes */
const SHIRT = ['#24452f', '#c8744f', '#efb54d', '#a8b88a', '#3f6f9a', '#7b5ea7', '#9c3b2f', '#d8ccaa', '#f1ede3', '#2f6f7e', '#4f6b3a', '#3c4452'];
const JEANS = ['#47566c', '#2f3a4a', '#3b3a36', '#5a4a3a', '#4a3f36', '#26382c', '#6b6f73', '#8a7a55'];
const SHOES = ['#2a2a2d', '#f1ede3', '#8a5a2b', '#24452f', '#9c3b2f', '#3f6f9a'];
const SOLES = ['#e9e6df', '#2a2a2d', '#c9b48a'];
const BELT = ['#2d251f', '#4a3624', '#1c1c1c', '#7a5a3a'];

export function randomCharacter(r: () => number = Math.random): Character {
	const face = r() < 0.5 ? 'woman' : 'man';
	const hair = face === 'woman' ? pick(r, ['long', 'long', 'bun', 'short']) : pick(r, ['short', 'short', 'none', 'long']);
	const hairColour = pick(r, HAIR);
	// a woman 1.55–1.80 m, a man 1.65–1.95 m
	const height = Math.round((face === 'woman' ? 1.55 + r() * 0.25 : 1.65 + r() * 0.3) * 100) / 100;
	return {
		height,
		look: {
			face,
			hair,
			hairColour,
			brows: hair === 'none' ? pick(r, HAIR) : hairColour,
			skin: pick(r, SKIN),
			iris: pick(r, EYES),
			lips: pick(r, LIPS),
			shirt: pick(r, SHIRT),
			trousers: pick(r, JEANS),
			belt: pick(r, BELT),
			shoes: pick(r, SHOES),
			soles: pick(r, SOLES)
		}
	};
}
