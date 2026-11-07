*/
function pinnate(bag, o) {
	const r = chance(o.seed, "pinnate", ...o.key);
	const g = clamp(o.grown);
	const old = clamp(o.old ?? 0);
	const len = o.length * lerp(.25, 1, g);
	const out = o.out.clone().setY(0).normalize();
	const lift = lerp(1.2, o.lift, g) - old * .6;
	let d = out.clone().multiplyScalar(Math.cos(lift)).add(v3(0, Math.sin(lift), 0)).normalize();
	let p = o.at.clone();
	/** @type {THREE.Vector3[]} */
	const pts = [];
	const droop = .05 + r() * .05 + old * .12 + (o.droop ?? 0);
	for (let k = 0; k <= 12; k++) {
		pts.push(p.clone());
		d = d.clone().addScaledVector(v3(0, -1, 0), droop * (k / 12)).normalize();
		p = p.clone().addScaledVector(d, len / 12);
