const STEP = {
	tray: 1,
	front: 1,
	handles: 1,
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
const GROUP = {
	tray: "case",
	front: "case",
	handles: "case",
	"plates-bottom": "contacts",
	"holder-bottom": "cells",
	cells: "cells",
	"holder-top": "cells",
	"plates-top": "contacts",
	bms: "electronics",
//#piece cdaee677e36f1d8dcf1ce2014ec032b0bfe9aebd8aaafaf69a09b7beb7dbe417
* `seg`: the sides of a cell (fewer where many packs stand closed).
* @param {ReturnType<typeof machineKit>} kit
* @param {{ at: V3, base: string, assembly?: (g: string) => string, step?: (p: string) => number, prefix?: string, unit?: string, seg?: number }} o
*/
function batteryPackParts(kit, { at, base, assembly = (g) => g, step = (p) => STEP[p], prefix = "", unit, seg = 10 }) {
//#piece c77c82481b9d875b0112b0a55f71a3e143483af4155a6be5b76f723654e23f73
