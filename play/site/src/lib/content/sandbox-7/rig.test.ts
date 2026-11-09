// Sandbox 7's camera, from orbit to a walk (intent 8d683ad6, c8): the zoom on a log scale between eye height and the
// ceiling, the gaze straight down far out and toward the horizon at the bottom, a drag that turns the globe far out and
// walks near it, the keys walking along the surface at eye height, and a flight that ends over the point it was sent to.
import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { latLonOf } from './maps';
import { GlobeRig } from './rig';

const SURFACE = 120.6, EYE = 0.9, CEILING = 600;
const rig = (altitude = 288) => new GlobeRig(new THREE.PerspectiveCamera(40, 1.5, 0.05, 2000), { surface: SURFACE, eye: EYE, ceiling: CEILING, start: { lat: 18.7, lon: -10.6 }, altitude });
const settle = (r: GlobeRig, seconds = 6) => {
	for (let t = 0; t < seconds; t += 1 / 60) r.update(1 / 60);
};
const deg = (r: number) => (r * 180) / Math.PI;

describe('from orbit to a walk', () => {
	test('the altitude follows the zoom on a log scale between eye height and the ceiling', () => {
		const r = rig();
		expect(r.altitudeAt(0)).toBeCloseTo(EYE, 9);
		expect(r.altitudeAt(1)).toBeCloseTo(CEILING, 9);
		// halfway in zoom is the geometric mean, not the middle
		expect(r.altitudeAt(0.5)).toBeCloseTo(Math.sqrt(EYE * CEILING), 9);
		r.zoomTo(5000);
		settle(r);
		expect(r.altitude).toBeCloseTo(CEILING, 3);
		expect(r.zoom).toBeCloseTo(1, 3);
	});
	test('straight down far out, toward the horizon at the bottom', () => {
		const r = rig();
		r.zoomTo(CEILING);
		settle(r);
		expect(deg(r.pitch)).toBeCloseTo(-89, 0);
		// the camera looks at the point beneath it
		const look = new THREE.Vector3(0, 0, -1).applyQuaternion(r['camera'].quaternion);
		expect(look.dot(r.pos.clone().negate())).toBeGreaterThan(0.999);
		r.zoomTo(EYE);
		settle(r, 10);
		expect(deg(r.pitch)).toBeCloseTo(-11, 0);
		expect(r.altitude).toBeCloseTo(EYE, 2);
		// the camera at eye height over the ground
		expect(r['camera'].position.length()).toBeCloseTo(SURFACE + EYE, 2);
	});
	test('a drag far out turns the globe; near the ground it turns you and walks', () => {
		const far = rig();
		const was = far.pos.clone(), heading = far.heading;
		far.drag(200, 0);
		expect(far.pos.angleTo(was)).toBeGreaterThan(0.05);
		expect(far.heading).toBe(heading);
		const near = rig(EYE);
		const at = near.pos.clone();
		near.drag(200, 0);
		// sideways near the ground: a turn, hardly a step
		expect(near.heading).toBeGreaterThan(0.5);
		expect(near.pos.angleTo(at)).toBeLessThan(1e-3);
		near.drag(0, 100);
		expect(near.pos.angleTo(at)).toBeGreaterThan(1e-5);
	});
	test('W walks ahead along the surface at eye height', () => {
		const r = rig(EYE);
		const at = r.pos.clone();
		r.keys.add('w');
		settle(r, 1);
		r.keys.clear();
		const moved = r.pos.angleTo(at) * SURFACE;
		expect(moved).toBeGreaterThan(0.01);
		// north at heading 0: the latitude grows
		expect(latLonOf(r.pos.toArray())[0]).toBeGreaterThan(latLonOf(at.toArray())[0]);
		expect(r.altitude).toBeCloseTo(EYE, 2);
	});
	test('a flight ends over the point it was sent to, come down to see it', () => {
		const r = rig();
		r.flyTo(40.6, -1.6);
		expect(r.flying).toBe(true);
		settle(r, 3);
		expect(r.flying).toBe(false);
		const [lat, lon] = latLonOf(r.pos.toArray());
		expect(lat).toBeCloseTo(40.6, 3);
		expect(lon).toBeCloseTo(-1.6, 3);
		expect(r.altitude).toBeLessThan(288);
		expect(r.altitude).toBeCloseTo(r.altitudeAt(0.62), 3);
	});
	test('a flight lands on time however few frames are drawn: two seconds in three frames', () => {
		const r = rig();
		r.flyTo(-33.85, 118.55);
		for (let k = 0; k < 3; k++) r.update(0.7);
		expect(r.flying).toBe(false);
		const [lat, lon] = latLonOf(r.pos.toArray());
		expect(lat).toBeCloseTo(-33.85, 3);
		expect(lon).toBeCloseTo(118.55, 3);
	});
});
