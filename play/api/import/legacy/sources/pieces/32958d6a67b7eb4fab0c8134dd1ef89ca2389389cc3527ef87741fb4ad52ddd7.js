	}
	/** the key turned: it starts in first, on the clutch */
	function restart() {
		s.stalled = false;
		s.running = true;
		s.gear = 1;
		s.launch = true;
		s.rpm = E.idle;
		s.why = "";
	}
	/** start it already running at the speed asked, in the gear for it, settled @param {Input} inp */
	function settle(inp) {
		s.v = inp.vSet;
		s.m = V.kerb + inp.load;
		s.gear = s.v > .5 ? pick(s.v, roadLoad({
			m: s.m,
			Crr: V.Crr,
			CdA: V.CdA
		}, s.v, inp.grade).F) : 1;
		s.rpm = s.v > .5 ? rpmOf(s.v, s.gear) : E.idle;
		for (let k = 0; k < 120; k++) step(.05, inp);
		s.wheelAng = s.engAng = s.propAng = 0;
	}
	return {
		s,
		step,
		settle,
		restart,
		rpmOf,
		fMax,
		tmax,
		tfric,
		iTot,
		pick
	};
}
const _pa = /* @__PURE__ */ (() => new three.Vector3())();
const _pb = /* @__PURE__ */ (() => new three.Vector3())();
const _up = /* @__PURE__ */ (() => new three.Vector3(0, 1, 0))();
/**
* Stand an object built along +y from its origin between two points (in its parent's frame): a link, a rod, an arm's
* leg, a shaft. With `stretch` it is built one metre long and stretched to reach.
* @param {THREE.Object3D} obj @param {V3} a @param {V3} b @param {boolean} [stretch]
*/
function aim(obj, a, b, stretch = false) {
	_pa.set(...a);
	_pb.set(...b).sub(_pa);
	const L = _pb.length();
	obj.position.copy(_pa);
	if (L > 1e-9) obj.quaternion.setFromUnitVectors(_up, _pb.divideScalar(L));
	if (stretch) obj.scale.set(1, Math.max(1e-4, L), 1);
	return L;
}
/** a point of a moving frame (the sprung body) where it is now in its parent's frame @param {THREE.Object3D} frame @param {V3} p @returns {V3} */
function inFrame(frame, p) {
	const v = new three.Vector3(...p).applyMatrix4(frame.matrix);
	return [
		v.x,
		v.y,
		v.z
	];
}
/** a bar one metre long along +y from its origin, for `aim(…, true)` @param {number} r @param {number} [seg] */
const unitBar = (r, seg = 10) => new three.CylinderGeometry(r, r, 1, seg, 1).translate(0, .5, 0);
/**
* A light spur gear (or sprocket, or ring gear) about z: square-cut teeth on its rim, its web between them and its
* bore. Centred on z = 0.
* @param {{ r: number, width: number, module?: number, bore?: number }} o r the pitch radius
*/
function spurGeometry({ r, width, module = .004, bore = .012 }) {
	const teeth = Math.max(8, Math.round(2 * r / module));
	const P = Math.PI * 2 / teeth;
	/** @type {number[]} */
	const angles = [];
	for (let k = 0; k < teeth; k++) angles.push(k * P, k * P + .38 * P, k * P + .5 * P, k * P + .88 * P);
	const rr = r - module, rt = r + module;
	return revolveX([
		[bore, -width / 2],
		[
			rr,
			-width / 2,
			1
		],
		[
			rr,
			width / 2,
			1
		],
		[bore, width / 2]
	], angles, (rad, _x, i, tag) => tag === 1 && i % 4 < 2 ? rt : rad).rotateY(-Math.PI / 2);
}
/**
* The outline round a set of pulleys: their convex hull, each pulley's arc joined to the next by a tangent. `grow`
* widens every pulley (a belt's outer face, or a cover over them).
* @param {[number, number, number][]} cs pulleys [x, y, r] @param {number} [grow]
