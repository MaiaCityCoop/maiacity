// @ts-nocheck — plain JS
/*
 * ONE MEASURE FOR EVERY ASSET AND EVERY WORLD (Samuel 2026-10-13): one scene unit is one metre. Every model is built
 * at its real size and placed without scaling; distances on a map and speeds on a road are metres and metres a
 * second. Write a size as 1.8 * M, 686 * MM or 35 * KMH so the measure reads in the code.
 */

/** a metre and a millimetre, in scene units */
export const M = 1;
export const MM = 0.001;
/** a kilometre an hour, in metres a second */
const KMH = 1000 / 3600;

/** how fast things move, at real speeds */
export const SPEED = {
	walk: 5 * KMH,
	track: 30 * KMH, // the pickup on a narrow offroad track with ruts
	highway: 80 * KMH // the old van on the sand highway
};
