const STEP$1 = {
	tray: 1,
	front: 1,
	charge: 1,
	handles: 1,
	clicklock: 1,
	"lock-pawls": 1,
	"lock-springs": 1,
	"lock-pivots": 1,
	"lock-cables": 1,
	"lock-trigger": 1,
	"plates-bottom": 2,
	"holder-bottom": 2,
	cells: 2,
	"holder-top": 3,
	"plates-top": 3,
	bms: 4,
	terminals: 4,
	lid: 5,
	latches: 5
};
const GROUP$1 = {
	tray: "case",
	front: "case",
	charge: "case",
	handles: "case",
	clicklock: "case",
//#piece 1fe05e212e885c1776e0d02e51cff502b23e49c779c19377820a157e62719c62
//#piece cdaee677e36f1d8dcf1ce2014ec032b0bfe9aebd8aaafaf69a09b7beb7dbe417
* `seg`: the sides of a cell (fewer where many packs stand closed). `v`: the version to build (2: its plug still on the
* face, no ClickLock; 3: the back plug and the ClickLock; 4: one centre grip whose
* trigger releases the ClickLock; 5: that grip low on its face, the lock at its height so the cables run straight,
* and its back plug as holes for the cube's pins; 6: a closed shell and one L-shaped service drawer carrying every
* inner part, released by two push buttons in the shell's sides; 7: the grip, the lock and two release buttons on the
* face's left and right ends, all down at the base plate's level; 8: the grip, the lock and the release buttons all on
* the shell, in its foot's sill across the face, the drawer riding on the foot; the back socket's holes in one line;
* 9: the release buttons and catches in the shell's two front corner columns, at the base plate's level, the catches
* shooting sideways into the base plate's edges).
* @param {ReturnType<typeof machineKit>} kit
* @param {{ at: V3, base: string, assembly?: (g: string) => string, step?: (p: string) => number, prefix?: string, unit?: string, seg?: number, v?: number }} o
*/
function batteryPackParts$1(kit, { at, base, assembly = (g) => g, step, prefix = "", unit, seg = 10, v = 9 }) {
	const G = v >= 8 ? GROUP_8 : v >= 7 ? {
		...GROUP_6,
		"release-left": "drawer",
		"release-right": "drawer"
	} : v >= 6 ? GROUP_6 : GROUP$1;
	const GRIP_Z = gripZ(v);
	const stepOf = step ?? ((p) => (v >= 8 ? STEP_8 : v >= 6 ? STEP_6 : STEP$1)[p]);
	const DZ = v >= 8 ? 17 : 0;
//#piece c77c82481b9d875b0112b0a55f71a3e143483af4155a6be5b76f723654e23f73
