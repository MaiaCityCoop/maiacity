//#piece 5b0ff7ffbd274609e12ab3b733f964c49f4695ea83210148950c0781b0bf78d0
	}
//#piece b9716007bb554edff94c3dba3960f639b0771b51832e74e5ca566dd486d38a1a
//#piece 6be8a84d11c3a2159c730138adaa1389bb9c1610689e94ccb8bed4aaa17307f5
//#piece 95a4f25f00d2a64f5ee768ff12e87ccdf9986cfb3cc198570e687a5adb22cf99
	}
}
const qa = /* @__PURE__ */ (() => new three.Quaternion())();
const qb = /* @__PURE__ */ (() => new three.Quaternion())();
const eb = /* @__PURE__ */ (() => new three.Euler())();
/**
* Between two poses: the root's place, and each bone turned t of the way from a to b along the shortest arc (its turns
* as rotations, not three angles each run on its own: a neck going from grazing to walking swings up the way a neck
* does, not through the odd tilts the angles pass on their own way), its size between.
*/
function blend(a, b, t) {
	const out = {};
	for (const name of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) {
		const x = a[name] ?? [
			0,
			0,
			0,
			1
		], y = b[name] ?? [
			0,
			0,
			0,
			1
		];
		if (name === "root") {
			out[name] = [
				0,
				1,
				2
			].map((k) => (x[k] ?? 0) + ((y[k] ?? 0) - (x[k] ?? 0)) * t);
			continue;
		}
		qa.setFromEuler(eb.set(x[0] ?? 0, x[1] ?? 0, x[2] ?? 0));
		qb.setFromEuler(eb.set(y[0] ?? 0, y[1] ?? 0, y[2] ?? 0));
		eb.setFromQuaternion(qa.slerp(qb, t));
		const size = (x[3] ?? 1) + ((y[3] ?? 1) - (x[3] ?? 1)) * t;
		const off = [
			4,
			5,
			6
		].map((k) => (x[k] ?? 0) + ((y[k] ?? 0) - (x[k] ?? 0)) * t);
		out[name] = off.some((o) => o !== 0) ? [
			eb.x,
			eb.y,
			eb.z,
			size,
			...off
		] : [
			eb.x,
			eb.y,
			eb.z,
			size
		];
	}
	return out;
}
/**
//#piece f50fc43cc4753bf64f18b4f64690f1271e74f074b39db30c8697b01086a43bb0
//#piece 65813ed20927d19ad26b09564bc9d00ea4ff7eea5930fb1fd4d540338885ea2e
