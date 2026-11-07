*/
function onBark$1(p, radius, r, key) {
//#piece acab48381dc99ca0985405f79e941e9990d488ee23ffd3796e73d005c4085e2a
	return {
		at: p.at.clone().addScaledVector(side, radius * .9),
		dir: side.clone().addScaledVector(p.dir, .6).normalize(),
		key
	};
}
function along$1(pts, u) {
	const f = clamp(u) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f));
	return {
//#piece 6d73f1bbad1c562649f49bf0bbb18cb05363d5d5e00199517a64f25ffebac360
*/
function leaves$1(bag, spec, seed, g, sh) {
	const L = spec.leaf;
	const lr = chance(seed, "leaves", ...sh.key);
//#piece a89606d228be0d86d6e28492283cdca18f3f169cf4e405dc055ef3f44f88e783
	};
//#piece e7454e094591a970d32e55e246dea40eb349bb7c672ce707a627fc21d173be1b
			const { at } = along$1(sh.pts, 1 - k % 3 * .08);
			leaf(at, out);
		}
		return;
	}
	if (isLeader && sh.gen === 0) {
		const top = Math.min(2.4, sh.length * .3);
		for (let k = 0; k < 18; k++) {
			const { at, dir } = along$1(sh.pts, 1 - top / sh.length * (k / 18));
			for (let m = 0; m < L.per * 2; m++) {
//#piece 0c8d7c86fe077486ff74b3dcab2bdb7446e90ade66bebc0778d6ba8420615cf5
	}
	if (isLeader) {
		const step = L.length * .75;
		const n = Math.min(24, Math.floor(sh.length / step));
		for (let k = 0; k < n; k++) {
			const u = (sh.gen === 1 ? .5 : .1) + (k + .5) / n * (sh.gen === 1 ? .5 : .9);
			const { at, dir } = along$1(sh.pts, u);
//#piece e8ba9e5028067463573a76a29d304a03bac5a4b6daf682509dbec452a0a41bad
	}
//#piece fa5659087adbb1bfa2158f1a0e5da7efe614797c98f5fd732a1f8f6fa613a61b
		const { at, dir } = along$1(sh.pts, u);
//#piece 32129cc18cfbbf575182c1aea8cc80bae1b458c190754577ee6491a1ad5aa8b5
