/** a log: bark round it, its cut ends showing the wood, white with mycelium as it is colonised */
function log(bag, a, b, R, colonised, bark) {
	const pts = [];
	for (let k = 0; k <= 24; k++) pts.push(a.clone().lerp(b, k / 24));
	bag.add("body", tube(pts, () => R, (u, v) => mix(bark, "#3a2e24", Math.pow(Math.abs(Math.sin(v * 70 + u * 13)), 6) * .6).lerp(new three.Color("#e8e4d8"), (u < .045 || u > .955 ? colonised : 0) * .5), 18));
	for (const [end, dir] of [[a, a.clone().sub(b)], [b, b.clone().sub(a)]]) bag.add("sheet", fan({
		size: R * .97,
		from: -Math.PI,
		to: Math.PI,
		edge: () => 1,
		paint: (s) => mix("#c8a878", "#f2eee4", clamp(colonised * 1.4 - (1 - s) * .6)).lerp(new three.Color("#8a6a4a"), Math.abs(Math.sin(s * 40)) > .9 ? .4 : 0),
		rings: 6,
		rays: 24
	}), new three.Matrix4().compose(end.clone().addScaledVector(dir.clone().normalize(), .001), new three.Quaternion().setFromUnitVectors(v3(0, 1, 0), dir.clone().normalize()), v3(1, 1, 1)));
}
