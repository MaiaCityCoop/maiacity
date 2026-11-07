	}
}
const Y = /* @__PURE__ */ (() => new three.Vector3(0, 1, 0))();
const axis = /* @__PURE__ */ (() => new three.Vector3())();
const q = /* @__PURE__ */ (() => new three.Quaternion())();
const e = /* @__PURE__ */ (() => new three.Euler())();
/** the turn (x, y, z) of `angle` about `dir` @param {THREE.Vector3} dir @param {number} angle @returns {V3} */
const turn = (dir, angle) => {
	e.setFromQuaternion(q.setFromAxisAngle(dir, angle), "XYZ");
	return [
		e.x,
		e.y,
		e.z
	];
};
/**
* Pose a forklift added by `forkliftParts` (turned `yaw`) into `p`: driven `move` metres forward (back if negative)
* from where it was built, its forks lifted `lift` metres, shown or hidden.
* @param {Pose} p @param {string} name @param {number} yaw
* @param {{ move?: number, lift?: number, show?: boolean }} s
*/
function forkliftPose(p, name, yaw, { move = 0, lift = 0, show = true }) {
	const f = new three.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
	p[name] = turn(axis.crossVectors(Y, f).normalize(), Math.asin(move / FAR));
	p[`${name}Lift`] = turn(axis.crossVectors(f, Y).normalize(), Math.asin(lift / FAR));
	p[`${name}Wheels`] = [...turn(axis.crossVectors(Y, f).normalize(), move / WR), show ? 1 : 0];
	const size = show ? 1 : 0;
	p[`${name}Body`] = [
		0,
		0,
		0,
		size
	];
	p[`${name}Forks`] = [
