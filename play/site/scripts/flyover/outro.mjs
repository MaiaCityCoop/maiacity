// THE OUTRO'S FLYOVERS — "now imagine a whole city of a million people living like that": the game's world map (seed
// maia: 898 villages, 1,346,269 people, 2,019 km²) in its City view, from one village's tower out to the whole valley,
// and last the map as the game shows it, its bar counting the villages and the people. 9:16 at 30 fps, for play's
// Stories. Run: node scripts/flyover/flyover.mjs scripts/flyover/outro.mjs (--stills first).
//
// Lenses, few and kept (cinematographer): 48° for the close shots among the domes, 40° for the village and the river, 34°
// long for the valley's depth, 38° (the game's own) for the god's eye and the game. The sun stands low in the
// north-west, so most shots look north, into it: the domes rimmed, their shadows toward the camera.
import { above, along, line, orbit } from './camera.mjs';

export const film = { seed: 'maia', fps: 30, size: [1080, 1920], shutter: 0.5 };

/** @param {{ village(id: number): [number, number], river: [number, number][] }} map */
export function shots(map) {
	const [tx, tz] = map.village(135), [px, pz] = map.village(185), [vx, vz] = map.village(77), [lx, lz] = map.village(174);
	// the ridge east of the centre, the plain and its villages beyond it to the north-west (dir, from the ridge's crest)
	const ridge = [2300, 600], dir = [Math.cos((240 * Math.PI) / 180), Math.sin((240 * Math.PI) / 180)];
	const from = (d, y) => [ridge[0] - dir[0] * d, y, ridge[1] - dir[1] * d], to = (d) => [ridge[0] + dir[0] * d, 0, ridge[1] + dir[1] * d];
	return [
		// ── close: one village, as someone living there sees it ──
		{ name: 'c1-tower-orbit', size: 'CU', dur: 6, note: 'round a sand village\'s tower and master dome, low among its domes and fruit trees, the mountains beyond',
			move: orbit({ c: [tx, tz], deg: [305, 270], r: 105, h: 42, y: 16, fov: 48 }) },
		{ name: 'c2-tower-push', size: 'MCU', dur: 6, note: 'low past the domes toward a tower standing at its lake',
			move: line({ eye: [[px + 215, 40, pz + 40], [px + 118, 31, pz + 20]], look: [[px, 15, pz], [px - 10, 15, pz]], fov: 45 }) },
		// ── medium: the village whole ──
		{ name: 'm1-village-pass', size: 'MS', dur: 6, note: 'over a village from its lake, tilting down until its tower is under the camera',
			move: line({ eye: [[vx, 150, vz + 390], [vx, 230, vz + 45]], look: [[vx, 0, vz - 60], [vx, 0, vz - 12]], fov: 40 }) },
		{ name: 'm2-village-row', size: 'MWS', dur: 6, note: 'sideways along a row of villages under the northern mountains, into the sun',
			move: line({ eye: [[-820, 72, -1530], [-500, 72, -1530]], look: [[-820, 0, -1890], [-500, 0, -1890]], fov: 40 }) },
		// ── wide: village after village ──
		{ name: 'w1-river', size: 'WS', dur: 6, note: 'up the river at a crane\'s height, villages on both banks, the river leading away',
			move: along({ path: map.river, from: 0.8, to: 0.745, h: 330, ahead: 1100, side: 110, fov: 40 }) },
		{ name: 'w2-river-north', size: 'WS', dur: 6, note: 'up the river\'s northern reach to where it leaves the valley between the mountains',
			move: along({ path: map.river, from: 0.31, to: 0.25, h: 240, ahead: 900, side: -130, fov: 40 }) },
		{ name: 'w3-ridge-reveal', size: 'WS→EWS', dur: 6, note: 'up over a hill: the plain and its villages rise into view behind its crest',
			move: line({ eye: [from(760, 70), from(470, 240)], look: [to(500), to(950)], fov: 30 }) },
		{ name: 'w4-rising', size: 'MS→EWS', dur: 6, note: 'a crane up and back from among a village\'s domes, the city spreading to the mountains as it rises',
			move: line({ eye: [[2420, 120, -860], [2450, 1250, -150]], look: [[2400, 0, -1090], [2380, 0, -1450]], fov: 40 }) },
		{ name: 'w5-rising-lake', size: 'MS→EWS', dur: 6, note: 'the same rise from a forest village beside its lake',
			move: line({ eye: [[lx + 95, 110, lz + 70], [lx + 320, 1150, lz + 560]], look: [[lx - 30, 0, lz - 30], [lx - 180, 0, lz - 330]], fov: 40 }) },
		// ── extreme wide: the whole city ──
		{ name: 'x1-valley-arc', size: 'EWS', dur: 6, note: 'high and slowly round the whole valley, the mountains ringing it',
			move: orbit({ c: [0, -200], deg: [78, 98], r: [3500, 3350], h: [1500, 1600], fov: 42 }) },
		{ name: 'x2-valley-glide', size: 'EWS', dur: 6, note: 'a long lens gliding north over the city toward the mountains, villages to the horizon',
			move: line({ eye: [[0, 850, 2100], [0, 850, 1550]], look: [[0, 0, -600], [0, 0, -1150]], fov: 34 }) },
		// ── the god's eye: the city as a pattern ──
		{ name: 'g1-above', size: 'EWS · top', dur: 6, note: 'straight down on the villages, each its tower and its rings of domes, turning slowly',
			move: above({ over: [[1990, -700], [2040, -860]], h: [1450, 1380], heading: [268, 280], fov: 38 }) },
		{ name: 'g2-above-tilt', size: 'WS · tilt-shift', dur: 6, look: ['tilt'], focus: 0.56, note: 'leaning over a cluster of villages, sharp in a band, like a model of the city',
			move: above({ over: [[2440, -1090], [2520, -1030]], h: [430, 410], heading: [262, 272], lean: 0.85, fov: 40 }) },
		// ── the game: the map as the game shows it ──
		{ name: 'z1-game-switch', size: 'EWS · the game', dur: 6, ui: true, cityFrom: 1.2, note: 'the map empty, then City: every village built; out to the whole map, the bar counting 898 villages and 1,346,269 people',
			move: line({ eye: [[0, 3000, 1450], [0, 4500, 2500]], look: [[0, 0, -60], [0, 0, 20]], fov: 38 }) },
		{ name: 'z2-game-whole', size: 'EWS · the game', dur: 5, ui: true, note: 'the whole city in the game, its bar on, slowly in',
			move: line({ eye: [[0, 4600, 2450], [0, 4050, 2150]], look: [[0, 0, 0], [0, 0, -40]], fov: 38 }) }
	];
}
