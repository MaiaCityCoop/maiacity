// The asset viewer lights its subject like a portrait (intent 0b9f05f8): at the default view the sun is in front of
// the subject, on the side opposite the camera, 40–60° round from the camera's line, 30–45° up, its hour 16:00.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sunFrom } from '$lib/content/sandbox-kit/sky.js';
import { HOUR, VIEW, portraitSun } from './portrait.js';

const deg = (r: number) => (r * 180) / Math.PI;

describe('the asset viewer light', () => {
	it('portrait light', () => {
		const { elevation, azimuth } = portraitSun();
		const sun = sunFrom(elevation, azimuth);
		// the camera's bearing on the ground, and the sun's, both from the subject
		const cam = { x: VIEW[0], z: VIEW[2] }, n = Math.hypot(cam.x, cam.z);
		const c = { x: cam.x / n, z: cam.z / n };
		const s = { x: sun.x, z: sun.z }, m = Math.hypot(s.x, s.z);
		const around = deg(Math.acos((c.x * s.x + c.z * s.z) / m));
		// in front of the subject (the camera's half), 40–60° round from the camera's line
		expect(around).toBeGreaterThanOrEqual(40);
		expect(around).toBeLessThanOrEqual(60);
		// on the side opposite the camera: the camera stands right of the subject's front, the sun left (as the camera
		// sees it), so their cross product's sign differs from a sun on the camera's own side
		const camRight = { x: c.z, z: -c.x }; // the camera looks along −c: its right is (−c) × up, on the ground
		expect(s.x * camRight.x + s.z * camRight.z).toBeLessThan(0);
		// 30–45° above the horizon
		const up = deg(Math.asin(sun.y));
		expect(up).toBeGreaterThanOrEqual(30);
		expect(up).toBeLessThanOrEqual(45);
		// its hour 16:00, and the viewer's stage takes it: the camera's view and the sun from the same place
		expect(HOUR).toBe(16);
		const stage = readFileSync(new URL('./stage.js', import.meta.url), 'utf8');
		expect(stage).toMatch(/hour === undefined \? portraitSun\(\)/);
		expect(stage).toMatch(/const at = hour \?\? HOUR;/);
		expect(stage).toMatch(/clock: \(\) => at/);
		const viewer = readFileSync(new URL('./viewer.js', import.meta.url), 'utf8');
		expect(viewer).toMatch(/const BACK = new THREE\.Vector3\(\.\.\.VIEW\)/);
		expect(viewer).toMatch(/new Stage\(view\.renderer, view\.camera, \{ low, sky: true \}\)/);
	});
});
