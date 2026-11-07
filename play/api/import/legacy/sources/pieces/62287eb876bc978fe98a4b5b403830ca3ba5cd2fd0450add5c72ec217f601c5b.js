/** where a point of the forklift built at the origin facing +z lands at `heel`, turned `yaw` @param {V3} heel @param {number} yaw */
const placer = (heel, yaw) => new three.Matrix4().makeTranslation(...heel).multiply(new three.Matrix4().makeRotationY(yaw));
/**
* Add a forklift to a rig: its bones (to `bones`, under `parent`) and its pieces (through `add`), its heel at `heel`,
* turned `yaw` about y (0 faces +z, π/2 faces +x). Its bones are named after it: `name` (it drives on it, pivoted far
* below), `nameBody`, `nameWheels`, `nameLift` (pivoted far behind) and `nameForks` (the forks and their carriage, so a
* size of 0 there and on the body and the wheels hides the forklift).
* @param {Add} add @param {BoneSpec[]} bones
* @param {{ name: string, parent?: string, heel: V3, yaw?: number }} o
*/
function forkliftParts(add, bones, { name, parent, heel, yaw = 0 }) {
	const m = placer(heel, yaw);
	/** @param {V3} p @returns {V3} */
	const to = (p) => new three.Vector3(...p).applyMatrix4(m).toArray();
	bones.push({
		name,
		...parent ? { parent } : {},
		at: to([
			0,
			-2e3,
			0
		])
	}, {
		name: `${name}Body`,
		parent: name,
		at: to([
			0,
			.3,
			-.5
		])
	}, {
		name: `${name}Wheels`,
		parent: name,
		at: to([
			0,
