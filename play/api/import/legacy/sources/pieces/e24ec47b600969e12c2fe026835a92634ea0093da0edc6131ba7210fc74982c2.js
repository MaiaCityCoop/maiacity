	return g;
}
function lantern(m, r, y) {
	const g = new three.Group();
//#piece 1483415d9020e654fb28a387d214e1e7e5d98f5a126f4aae29d9f70f6da1ec3c
/** @typedef {import('$lib/sandbox-2/interior/spaces').Kit} Kit */
/** the domes' surfaces and furniture, as a dome lends them to its spaces; made once, when the first is built */
/** @type {Kit | null} */
let kit = null;
const kitOf = () => {
	if (kit) return kit;
	const m = mats();
	return kit = {
		box,
		table: (len, chairs) => table(m, len, chairs),
		sofa: (len) => sofa(m, len),
		lantern: (r, y) => lantern(m, r, y),
		oak: m.oak(1),
		lime: m.lime(1),
		stone: (rep) => m.stone(rep),
		dark: m.dark,
		steel: m.steel,
		counter: m.counter,
		timber: m.timberFrame,
		linen: m.linen,
		cushion: m.cushion,
		rug: m.rug,
		paper: m.paper
	};
};
