/*
 * TEST WORLD — the stand-in world of play's world tests and the dev harness (play/SPEC.md §4.11), never proposed, and
 * the template of the world contract v1: a 400 m stretch of a two-lane road across bare soil, one traffic signal for
 * each way, cars on both lanes that keep their distance, queue and stop at red, an ambulance that passes with its
 * beacons and siren, horns from the queue. Everything that moves is the world's own recipe, run live in the box
 * (`root.userData.tick`); the page only follows the `use:` nodes it moves and reads their `state:` nodes.
 *
 * The guests it names by hash (`use:<hash>?values`): its car and its signal. Here they are the stand-ins beside this
 * file; render.mjs `--guests` hands them to the page and puts the hashes they are held by in place of these.
 */
const THREE = require('three');

/** the guests, by the hash play holds each by (here: placeholders the harness replaces) */
const CAR = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
const SIGNAL = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
/** the recordings (play files by BLAKE3 hash) its sound plays: the film's traffic bed, horn and siren (story 60f6da00-979d-89e4-b1e5-53667ba41fe4) */
const SOUND = {
	bed: '9e2ea493f7f3ab729af296e56a999cb601ff8396c0e6b4717650b6cb219a5c7d',
	horn: '1b52448443cd06b9d74cc784d19f155bd14524833b923ddd5446bdabbb366cf6',
	siren: 'b058632eae2c81bed4b39bb4bf39e51502fe8898056b58ef0e8f969de458afb1'
};

const PARAMS = [{ id: 'cars', label: 'Cars a lane', type: 'integer', min: 0, max: 60, value: 18 }];

/** a seeded random, so a world runs the same every time */
function seeded(seed) {
	let s = seed >>> 0;
	return () => ((s = (s + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 15)) * (1 | s)) >>> 0) / 4294967296);
}

const ROAD = { from: -200, to: 200, lane: 3.5 };
/** the two lanes: their side (z), their way along x, and the stop line before their signal */
const LANES = [
	{ z: ROAD.lane / 2, dir: 1, stop: -8, signal: { x: -6, z: ROAD.lane + 1, turn: -Math.PI / 2 } },
	{ z: -ROAD.lane / 2, dir: -1, stop: 8, signal: { x: 6, z: -ROAD.lane - 1, turn: Math.PI / 2 } }
];
/** the signals' cycle (s): green, amber, red, red and amber (the second way's offset by half) */
const CYCLE = { green: 16, amber: 3, red: 19 };
const PERIOD = CYCLE.green + CYCLE.amber + CYCLE.red;
const phaseAt = (t) => {
	const p = ((t % PERIOD) + PERIOD) % PERIOD;
	return p < CYCLE.green ? 'green' : p < CYCLE.green + CYCLE.amber ? 'amber' : 'red';
};

/** car following (the intelligent driver model): its wish speed, gap, headway, comfortable accelerations */
const IDM = { v0: 13.9, s0: 2.2, T: 1.4, a: 1.2, b: 2.0 };
const LENGTH = 4.2;

function plane(name, w, d, color, y = 0) {
	const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
	m.name = name;
	m.position.y = y;
	return m;
}

/** a guest's node, with its state nodes (each on while visible) */
function guest(hash, values, states) {
	const n = new THREE.Group();
	n.name = `use:${hash}${values ? `?${values}` : ''}`;
	const st = {};
	for (const s of states) {
		const o = new THREE.Object3D();
		o.name = `state:${s}`;
		o.visible = false;
		n.add(o);
		st[s] = o;
	}
	return { node: n, st };
}

function build(cars = 18) {
	const root = new THREE.Group();
	const rnd = seeded(1905);
	// the land: bare soil to the haze, the road and its markings
	root.add(plane('soil', 900, 900, '#6b5a48'));
	root.add(plane('road', ROAD.to - ROAD.from, ROAD.lane * 2, '#3b3c3e', 0.02));
	for (let x = ROAD.from; x < ROAD.to; x += 12) {
		const dash = plane('marking', 6, 0.15, '#d8d4c4', 0.03);
		dash.position.x = x + 3;
		root.add(dash);
	}
	for (const L of LANES) {
		const line = plane('stop-line', 0.4, ROAD.lane, '#e2ded0', 0.03);
		line.position.set(L.stop, 0.03, L.z);
		root.add(line);
	}
	// the mood and the sound, as nodes the page reads
	const mood = new THREE.Object3D();
	mood.name = 'mood:smog-dusk';
	root.add(mood);
	for (const [k, h] of Object.entries(SOUND)) {
		const s = new THREE.Object3D();
		s.name = `sound:${h}?for=${k}&gain=${k === 'bed' ? 0.5 : 0.8}`;
		root.add(s);
	}
	// where to look from: over the junction, and a driver's eye in the queue
	for (const [name, x, y, z, turn, tilt] of [['junction', -40, 14, 22, Math.atan2(40, -22), 0.3], ['queue', -60, 1.2, 0.2, Math.PI / 2, 0.02]]) {
		const v = new THREE.Object3D();
		v.name = `view:${name}`;
		v.position.set(x, y, z);
		v.rotation.set(0, turn, 0, 'YXZ');
		v.rotateX(tilt);
		root.add(v);
	}
	// the signals, one a way
	const signals = LANES.map((L) => {
		const g = guest(SIGNAL, '', ['red', 'amber', 'green']);
		g.node.position.set(L.signal.x, 0, L.signal.z);
		g.node.rotation.y = L.signal.turn;
		root.add(g.node);
		return g;
	});
	// the cars, spaced along each lane; and an ambulance on the first
	const movers = [];
	LANES.forEach((L, li) => {
		for (let i = 0; i < cars; i++) {
			const g = guest(CAR, 'kind=0', ['head', 'tail', 'brake', 'horn']);
			g.st.head.visible = g.st.tail.visible = true;
			root.add(g.node);
			movers.push({ ...g, lane: li, s: (i / Math.max(1, cars)) * (ROAD.to - ROAD.from) + rnd() * 4, v: IDM.v0 * (0.5 + 0.5 * rnd()), queued: 0, honk: 0, len: LENGTH, wish: IDM.v0 * (0.85 + 0.3 * rnd()) });
		}
	});
	const amb = guest(CAR, 'kind=1', ['head', 'tail', 'brake', 'beacon', 'siren']);
	// a seat a film's camera may ride in: the ambulance's driver, eye height, looking ahead (+z)
	const seat = new THREE.Object3D();
	seat.name = 'frame:ambulance-driver';
	seat.position.set(-0.45, 1.6, 1.2);
	amb.node.add(seat);
	amb.st.head.visible = amb.st.tail.visible = amb.st.beacon.visible = amb.st.siren.visible = true;
	root.add(amb.node);
	const ambulance = { ...amb, s: 0, v: 18, len: 5.6, lane: -1 };

	let t = 0;
	const place = (m, L) => {
		const x = L.dir > 0 ? ROAD.from + m.s : ROAD.to - m.s;
		m.node.position.set(x, 0, L.z);
		m.node.rotation.y = (L.dir * Math.PI) / 2;
	};
	/** one step of the traffic */
	function step(dt) {
		t += dt;
		const span = ROAD.to - ROAD.from;
		signals.forEach((g, i) => {
			const p = phaseAt(t + (i ? PERIOD / 2 : 0));
			for (const k of ['red', 'amber', 'green']) g.st[k].visible = p === k;
		});
		LANES.forEach((L, li) => {
			const lane = movers.filter((m) => m.lane === li).sort((a, b) => a.s - b.s);
			const red = phaseAt(t + (li ? PERIOD / 2 : 0)) !== 'green';
			const stopAt = L.dir > 0 ? L.stop - ROAD.from : ROAD.to - L.stop;
			lane.forEach((m, i) => {
				const ahead = lane[(i + 1) % lane.length];
				let gap = (ahead.s - m.s + span) % span - ahead.len, dv = m.v - ahead.v;
				if (lane.length < 2) (gap = 1e9), (dv = 0);
				// a red (or amber) ahead it can still stop for is a car standing on the line
				const toLine = stopAt - m.s - m.len / 2;
				if (red && toLine > -0.5 && toLine < gap && toLine > (m.v * m.v) / (2 * IDM.b * 3)) (gap = Math.max(0.1, toLine)), (dv = m.v);
				const sStar = IDM.s0 + Math.max(0, m.v * IDM.T + (m.v * dv) / (2 * Math.sqrt(IDM.a * IDM.b)));
				const acc = IDM.a * (1 - (m.v / m.wish) ** 4 - (sStar / Math.max(0.1, gap)) ** 2);
				m.v = Math.max(0, m.v + acc * dt);
				m.s = (m.s + m.v * dt) % span;
				m.st.brake.visible = acc < -0.6 || m.v < 0.3;
				// stood in the queue long enough, now and then a horn
				m.queued = m.v < 0.5 ? m.queued + dt : 0;
				if (m.honk > 0) m.honk -= dt;
				else if (m.queued > 5 && rnd() < dt * 0.08) m.honk = 0.5;
				m.st.horn.visible = m.honk > 0;
				place(m, L);
			});
		});
		// the ambulance down the middle, past everything, once a minute
		ambulance.s = ((t % 60) / 60) * (span + 200) - 100;
		ambulance.node.visible = ambulance.s > 0 && ambulance.s < span;
		ambulance.node.position.set(ROAD.from + ambulance.s, 0, 0);
		ambulance.node.rotation.y = Math.PI / 2;
	}
	for (let i = 0; i < 300; i++) step(0.1); // the traffic settled before the first look
	// the box hands the tick the world's time t (s since its run began, a quarter second more at most each call): the
	// world brought to t in steps of exactly 0.1 s, counted (so the same world at the same t however it got there: a
	// film steps through a shot, the page frame by frame)
	let steps = 0;
	root.userData.tick = (t) => {
		const to = Number(t) || 0;
		while ((steps + 1) * 0.1 <= to + 1e-9) {
			step(0.1);
			steps++;
		}
	};
	return root;
}

module.exports.recipe = function (id, v, variant) {
	if (id !== 'test-world' || variant) throw new Error(`no asset worlds/${id}@${v} in this file`);
	return { meta: { group: 'worlds', id: 'test-world', version: v, label: 'Test world', note: 'A road across bare soil with a signal each way and its traffic: the stand-in of the world tests.', params: PARAMS }, build };
};
module.exports.phaseAt = phaseAt;
