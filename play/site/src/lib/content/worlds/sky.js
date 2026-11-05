// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * A WORLD'S SKY AND LIGHT, from its mood (./contract.js `moodOf`): a dome drawn round the eye, from its zenith colour
 * down to its haze at the horizon (an overcast, smoggy dusk is a low grey lid with a sickly warm band where the sun
 * sets, behind the smog: no disc, only a smear), the fog in the haze's colour so the land fades into exactly the sky
 * behind it, the sun (dim, low, warm, its shadow soft) and the sky's own light on everything. `apply(mood)` again
 * when the world shown changes.
 */
import * as THREE from 'three';

const lin = (hex) => new THREE.Color(`#${hex}`).convertSRGBToLinear();

export function createSky(scene, renderer) {
	const uniforms = {
		uZenith: { value: new THREE.Color() },
		uHorizon: { value: new THREE.Color() },
		uHaze: { value: new THREE.Color() },
		uSunC: { value: new THREE.Color() },
		uSun: { value: new THREE.Vector3(0, 1, 0) },
		uSmog: { value: 0.5 }
	};
	const dome = new THREE.Mesh(
		new THREE.SphereGeometry(1, 48, 24),
		new THREE.ShaderMaterial({
			uniforms,
			side: THREE.BackSide,
			depthWrite: false,
			depthTest: false,
			fog: false,
			toneMapped: false,
			vertexShader: /* glsl */ `
				varying vec3 vDir;
				void main() {
					vDir = normalize(position);
					vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					gl_Position = p.xyww;
				}`,
			fragmentShader: /* glsl */ `
				varying vec3 vDir;
				uniform vec3 uZenith, uHorizon, uHaze, uSunC, uSun;
				uniform float uSmog;
				float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
				float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
					return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
				void main() {
					vec3 d = normalize(vDir);
					float h = d.y;
					// the lid: from the haze low down to the zenith (the horizon's colour only in its band, below)
					vec3 c = mix(uHaze, uZenith, pow(clamp(h, 0.0, 1.0), 0.5));
					// the smog's lid: slow, heavy banks of cloud, darker in their bellies
					vec2 q = d.xz / max(0.08, h + 0.12) * 1.6;
					float n = noise(q) * 0.6 + noise(q * 2.3) * 0.3 + noise(q * 5.1) * 0.1;
					c *= mix(1.0, 0.78 + 0.35 * n, uSmog * smoothstep(0.02, 0.35, h));
					// the sun behind it: a smear of warm light low in the haze, no disc
					float s = max(0.0, dot(d, normalize(uSun)));
					c += uSunC * (pow(s, 6.0) * 0.35 + pow(s, 40.0) * 0.5) * (1.0 - 0.6 * uSmog);
					// the band of haze where the land meets the sky, and the land's colour below it
					// the cold grey haze over the lower sky, the sick yellow-brown only in a thin band at the horizon
					c = mix(c, uHaze, smoothstep(0.3, 0.04, h) * 0.75);
					c = mix(c, uHorizon, smoothstep(0.05, 0.0, abs(h)) * 0.55);
					if (h < 0.0) c = uHaze;
					// not tone mapped: three lays fog on after tone mapping, so the land fades into exactly this colour
					gl_FragColor = vec4(c, 1.0);
					#include <colorspace_fragment>
				}`
		})
	);
	dome.name = 'sky';
	dome.frustumCulled = false;
	dome.renderOrder = -1000;
	scene.add(dome);
	const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
	const sun = new THREE.DirectionalLight(0xffffff, 1);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	sun.shadow.bias = -0.0004;
	sun.shadow.normalBias = 0.03;
	const s = sun.shadow.camera;
	s.left = s.bottom = -90;
	s.right = s.top = 90;
	s.near = 1;
	s.far = 700;
	scene.add(hemi, sun, sun.target);
	scene.fog = new THREE.FogExp2(0xffffff, 0.003);
	let mood = null;

	return {
		dome,
		sun,
		hemi,
		get mood() {
			return mood;
		},
		apply(m) {
			mood = m;
			uniforms.uZenith.value.copy(lin(m.zenith));
			uniforms.uHorizon.value.copy(lin(m.horizon));
			uniforms.uHaze.value.copy(lin(m.haze));
			uniforms.uSunC.value.copy(lin(m.sunColor));
			const a = THREE.MathUtils.degToRad(m.az), e = THREE.MathUtils.degToRad(Math.max(m.sun, 2));
			uniforms.uSun.value.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
			uniforms.uSmog.value = m.preset === 'smog-dusk' || m.preset === 'overcast' ? 1 : 0.15;
			scene.fog.color.copy(lin(m.haze));
			scene.fog.density = m.fog;
			// the sky's light: from the lid above, the dull ground below; the sun dim and warm through the smog
			hemi.color.copy(lin(m.zenith)).lerp(new THREE.Color(1, 1, 1), 0.6);
			hemi.groundColor.copy(lin(m.haze)).multiplyScalar(0.7);
			hemi.intensity = 3.2 * m.light;
			sun.color.copy(lin(m.sunColor));
			// no shadow pass at all where the mood casts none (every caster would be drawn a second time)
			sun.castShadow = m.shadows;
			sun.intensity = m.sun > 0 ? 3.2 * m.light * Math.min(1, 0.45 + m.sun / 25) : 0.15;
			renderer.toneMappingExposure = 1.0 + 0.2 * m.light;
		},
		/** each frame: the dome round the eye, the sun's shadow over where the camera looks */
		place(camera, focus) {
			// the smog lies low: thick in the streets, thinner the higher the eye (a crane shot over a city of 6.5 km still
			// reads its blocks two kilometres off), at a third of it from 300 m up
			if (mood) scene.fog.density = mood.fog * (1 - 0.65 * THREE.MathUtils.smoothstep(camera.position.y, 15, 300));
			dome.position.copy(camera.position);
			dome.scale.setScalar(camera.far * 0.95);
			const f = focus ?? camera.position;
			sun.target.position.copy(f);
			sun.position.copy(f).addScaledVector(uniforms.uSun.value, 300);
		},
		dispose() {
			dome.geometry.dispose();
			dome.material.dispose();
			scene.remove(dome, hemi, sun, sun.target);
			sun.shadow.map?.dispose();
			scene.fog = null;
		}
	};
}
