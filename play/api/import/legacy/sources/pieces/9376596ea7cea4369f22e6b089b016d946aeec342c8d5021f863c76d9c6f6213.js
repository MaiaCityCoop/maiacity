//#region src/lib/models/units.js
const CM = .01;
const MM = .001;
/** a kilometre an hour, in metres a second */
const KMH = 1e3 / 3600;
/** how fast things move, at real speeds */
const SPEED = {
	walk: 5 * KMH,
	track: 30 * KMH,
	highway: 80 * KMH
};

//#endregion
//#region src/lib/models/planting.js
