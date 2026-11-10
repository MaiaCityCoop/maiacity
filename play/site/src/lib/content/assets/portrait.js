/**
 * The asset viewer's portrait light (intent 0b9f05f8, Samuel 2026-11-10: "like the triangle of perfect lighting: not
 * in the background, but opposite the camera, like Rembrandt lighting … maybe 4 o'clock").
 *
 * Where the viewer's camera first stands from what it frames (`VIEW`, ./viewer.js `camerawork`), and the sun placed from
 * it (`portraitSun`): in front of the subject, on the side opposite the camera, `TURN`° round the subject from the
 * camera's line, as high as a 4 pm sun stands (`ELEVATION`), the sky's hour held at `HOUR`. The key light follows the
 * sun (./stage.js), so a face shows the small triangle of light on its shadow side and its shadow falls behind and to
 * the camera's side. The sun stays where it is in the world when the viewer is turned: only the first view is framed so.
 *
 * Pure (no three): bearings in degrees from +z toward +x, as $content/sandbox-kit/sky.js's `sunFrom` takes them.
 */

/** where the camera stands from what it aims at, for each metre of an asset's reach (./viewer.js `camerawork`): low
 *  enough (about 10° up) that the sky behind the asset is in the frame, the horizon a little over the middle */
export const VIEW = /** @type {const} */ ([1.5, 0.45, 1.9]);
/** the sky's hour the viewer holds: four in the afternoon */
export const HOUR = 16;
/** how high the sun stands at four in the afternoon (degrees): a summer's 4 pm at Maia City's latitude, high enough
 *  that the nose's shadow falls down onto the cheek, low enough that the eyes are not in shadow */
export const ELEVATION = 42;
/** how far round the subject from the camera's line the sun stands (degrees): a figure faces +z and the camera stands
 *  38° off its nose, so 45° put the sun almost on the nose (flat, no triangle; the stand-in's shot, 2026-11-10); 58°
 *  stands it ~20° off the nose on the far side, the near cheek in shadow with its triangle of light */
export const TURN = 58;

/** the camera's bearing round what it frames (degrees, from +z toward +x) */
export const cameraBearing = (view = VIEW) => (Math.atan2(view[0], view[2]) * 180) / Math.PI;

/**
 * The sun for a camera standing `view` from its subject: the camera's bearing turned `TURN`° to the camera's left, so
 * the sun stands front-left of the subject as the camera sees it, on the far side of the camera's line.
 * @param {readonly number[]} [view]
 * @returns {{ elevation: number, azimuth: number }}
 */
export function portraitSun(view = VIEW) {
	const azimuth = (((cameraBearing(view) - TURN) % 360) + 360) % 360;
	return { elevation: ELEVATION, azimuth };
}
