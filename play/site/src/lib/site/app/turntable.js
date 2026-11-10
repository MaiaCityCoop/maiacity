/*
 * The turntables' camera ($lib/app/Turntable.svelte: the biomes, the things, the buildings, the actors, the machines, the plants), fitted to the
 * canvas it draws on. A turntable frames its thing for a canvas as wide as it is high or wider; on a canvas taller than
 * it is wide (a phone upright, a tablet) the same field of view would cut the thing off at its sides, so the view
 * widens there until it is as wide as it would be on a square canvas.
 */

/**
 * Size the camera to a canvas of `w` × `h`: its aspect, and its field of view widened from its turntable's own
 * (`camera.userData.fov`, set by the page; without one, as it is — a walk keeps its own) on an upright canvas; framed
 * in the canvas under the top `camera.userData.top` px (the turntable's floating head, its `room`; at most 0.4 of it),
 * the view carried on up over them.
 * @param {import('three').PerspectiveCamera} camera @param {number} w @param {number} h
 */
export function fit(camera, w, h) {
	const top = Math.max(0, Math.min(camera.userData.top ?? 0, h * 0.4));
	const below = Math.max(1, h - top);
	camera.aspect = w / below;
	const fov = camera.userData.fov;
	if (fov) {
		const half = Math.tan((fov * Math.PI) / 360);
		camera.fov = camera.aspect < 1 ? Math.min(100, (Math.atan(half / camera.aspect) * 360) / Math.PI) : fov;
	}
	// the head's row floats over the canvas's top edge (intent cd431267): the camera frames its thing in the canvas
	// under the row, as it framed it when the row stood above the canvas, and the scene goes on up behind it
	if (top > 0 && w > 0) camera.setViewOffset(w, below, 0, -top, w, h);
	else camera.clearViewOffset();
	camera.updateProjectionMatrix();
}
