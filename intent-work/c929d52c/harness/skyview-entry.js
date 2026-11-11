import * as THREE from 'three';
import { WebGPURenderer } from 'three/webgpu';
import { createUniverse, groundStars } from './src/lib/content/sandbox-kit/universe.js';
import { lightAt } from './src/lib/content/sandbox-kit/sky.js';
window.go = async (hours, pitch, cover) => {
	const canvas = document.querySelector('canvas');
	const r = new WebGPURenderer({ canvas, antialias: false });
	await r.init();
	r.toneMapping = THREE.AgXToneMapping;
	r.setSize(canvas.width, canvas.height, false);
	const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(55, canvas.width / canvas.height, 0.1, 2000);
	cam.rotation.set(pitch, 0.6, 0, 'YXZ');
	const u = createUniverse({ clouds: cover });
	scene.add(u.dome, u.stars);
	window.sync = () => { const gl = r.backend.gl; const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
	window.shot = async (hour) => {
		const l = lightAt(hour);
		u.set({ sun: l.dir, moon: l.moon, stars: groundStars(hour), hour });
		r.toneMappingExposure = l.exposure;
		await r.renderAsync(scene, cam);
	};
};
