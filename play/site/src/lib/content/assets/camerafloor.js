// @ts-nocheck — plain JS
/*
 * THE CAMERA ABOVE THE GROUND — one rule for the asset viewer's camera, by the asset's group (intent 119a02d1;
 * Samuel 2026-11-09: "in any viewer but the plant asset viewer the camera should not be able to go below the ground
 * floor"). A plant's viewer may look below the ground line to show its roots; every other group's camera is held
 * above its ground: the orbit's lowest angle worked out each frame from how high the point looked at stands and how
 * far the eye is from it (so a drag, a scroll or a pinch stops at the floor, and an eye may still look up at a tall
 * building from near the ground), and the eye and the point looked at lifted back over the floor where a pan, a key
 * or a glide took them under it.
 *
 *   mayGoBelow(group)                         whether this group's camera may go below the ground (plants only)
 *   maxPolar(group, { soiled, targetY, groundY, distance, margin })   the orbit's lowest angle from straight above
 *   keepAbove(group, eye, target, groundY, margin)                    lifts both over the floor; whether it moved them
 */

/** only a plant's viewer looks below the ground line, at its roots @param {string | undefined} group */
export const mayGoBelow = (group) => group === 'plants';

/**
 * The orbit's lowest angle from straight above (OrbitControls' maxPolarAngle). A plant on its soil to 60° under the
 * ground line, a plant's fruit on the studio's floor all round; any other asset as low as keeps its eye `margin` over
 * the ground at this distance from the point looked at.
 */
export function maxPolar(group, { soiled = false, targetY = 0, groundY = 0, distance = 1, margin = 0.005 } = {}) {
	if (mayGoBelow(group)) return soiled ? Math.PI * (5 / 6) : Math.PI;
	// the eye stands at targetY + distance · cos(polar): over groundY + margin while cos(polar) ≥ -(h / distance)
	const h = targetY - groundY - margin;
	return Math.acos(Math.max(-1, Math.min(1, -h / Math.max(distance, 1e-6))));
}

/**
 * The eye and the point looked at lifted back over the floor (a pan, a key, a glide that took them under it): the
 * point to the ground, the eye with it, then the eye to `margin` over it. Nothing for a plant's viewer.
 * @param {{ y: number }} eye @param {{ y: number }} target
 */
export function keepAbove(group, eye, target, groundY, margin = 0.005) {
	if (mayGoBelow(group)) return false;
	let moved = false;
	if (target.y < groundY) {
		eye.y += groundY - target.y;
		target.y = groundY;
		moved = true;
	}
	if (eye.y < groundY + margin) {
		eye.y = groundY + margin;
		moved = true;
	}
	return moved;
}
