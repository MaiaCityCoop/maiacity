/*
 * LAMP, MUSHROOM — a table lamp 0.42 m high, as the bedroom of reference picture 4 has them on its nightstands: a domed
 * opal glass shade Ø 0.35 m on a stem and foot of glazed white ceramic. (Mushroom lamps of this kind run 30–50 cm high
 * with shades Ø 25–40 cm; their opal glass is 3–4 mm thick.) The foot a thin disc Ø 0.16 m with a soft edge; the stem a
 * trumpet flaring down into it, Ø 49 mm under the shade; the shade a flattened dome of opal
 * glass 4 mm thick with a rounded rim, lit, a bulb in its socket under it; a cork-dark felt under the foot. Lathes
 * throughout. Glazed ceramic ('glaze'), opal glass lit low ('tA-opal', its own: the kit's 'opal' is the bulb), the socket's ring in brass ('brass'), the felt under
 * it ('shadow'); the cord is left to the room. It gives no light of its own (the room's lights are the dome's): its glass glows.
 */
/** the shade's opal glass, lit low: it glows, yet its dome still reads in a sunlit room (the kit's 'opal' is a bulb's glare) */
material('tA-opal', 1, () => new THREE.MeshPhysicalMaterial({ color: '#fbf8f2', emissive: '#ffe2bd', emissiveIntensity: 0.5, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.6 }));

const THING = {
	id: 'lamp-mushroom',
	label: 'Lamp, mushroom',
	note: 'A table lamp 0.42 m high: a domed opal glass shade Ø 0.35 m, lit, on a stem and foot of glazed white ceramic.'
};

/* ---- shapes this thing is made with ---- */



/* ---- the thing ---- */

/** a quarter round from (r0, y0) going `dir` … points of a fillet of radius `rad` about the centre (cx, cy), angles a0 → a1 */
function t_arc(cx, cy, rad, a0, a1, n) {
	const out = [];
	for (let i = 0; i <= n; i++) {
		const a = lerp(a0, a1, i / n);
		out.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
	}
	return out;
}

function thingBuild() {
	const bag = new Bag(THING.id);
	const o = { chunk: false };
	const seg = 72;
	// the foot and the stem, one piece of glazed ceramic, from the middle of its underside out, up and in
	const foot = [
		[0.0, 0.003],
		[0.074, 0.003],
		...t_arc(0.077, 0.007, 0.004, -Math.PI / 2, 0, 4),
		...t_arc(0.075, 0.009, 0.006, 0, Math.PI / 2 * 0.9, 4)
	];
	// the stem: a trumpet flaring into the foot, a little waisted under the shade
	for (let i = 0; i <= 18; i++) {
		const y = 0.0155 + (i / 18) ** 1.4 * (0.268 - 0.0155);
		const f = 1 - (y - 0.0155) / 0.2525;
		foot.push([0.0245 + 0.048 * Math.pow(Math.max(0, f), 3.2) + 0.0015 * Math.sin(Math.PI * (1 - f)), y]);
	}
	bag.add('glaze', lathe(foot, seg), null, o);
	// the felt under it
	bag.add('shadow', lathe([[0, 0], [0.068, 0], [0.069, 0.0015], [0.068, 0.003]], seg), null, o);
	// the shade: opal glass 4 mm thick, from the middle of its inside down to its rim, round the rim and up its outside
	const rim = 0.252, R = 0.175, H = 0.168, t = 0.004;
	const dome = (r, h, a) => [r * Math.pow(Math.cos(a), 0.85), rim + h * Math.pow(Math.sin(a), 1.15)];
	const shade = [];
	for (let i = 0; i <= 24; i++) shade.push(dome(R - t, H - t, (Math.PI / 2) * (1 - i / 24)));
	for (let i = 1; i < 6; i++) {
		const a = Math.PI + (Math.PI * i) / 6;
		shade.push([R - t / 2 - (t / 2) * Math.cos(a) * -1, rim + (t / 2) * Math.sin(a)]);
	}
	for (let i = 0; i <= 24; i++) shade.push(dome(R, H, (Math.PI / 2) * (i / 24)));
	bag.add('tA-opal', lathe(shade, 96), null, o);
	// under the shade: the socket with its brass ring, and the bulb
	bag.add('brass', lathe([[0.024, 0.262], [0.0265, 0.264], [0.0265, 0.272], [0.024, 0.274]], seg), null, o);
	bag.add('glaze', lathe([[0.024, 0.274], [0.021, 0.276], [0.021, 0.32], [0.017, 0.322]], seg), null, o);
	bag.add('opal', lathe(t_arc(0, 0.352, 0.03, -Math.PI / 2 + 0.6, Math.PI / 2, 10), seg), null, o);
	return bag.build();
}
