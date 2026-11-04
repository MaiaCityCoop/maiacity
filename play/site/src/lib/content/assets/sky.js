// @ts-nocheck — plain JS, trusted: runs in the page
/*
 * THE VIEWER'S SKY — the sky every asset is shown under on the stage (./stage.js): a clear afternoon, about four
 * o'clock, a plain blue sky kept quiet in the background so the asset stays what is looked at. The sun stands in
 * the back, behind the asset as the viewer first frames it (the camera looks from the front right, ./viewer.js
 * `camerawork`) and a little to one side, so it lights its edges and throws its shadow toward the eye; its front is
 * lit by the sky itself and a soft fill from the eye's side, so nothing turns to silhouette.
 *
 *   the dome     a sky drawn at the far plane round the eye: blue at the zenith, paler down to a light haze on the
 *                horizon, a little brighter toward the sun; the sun's disc and a small glow; a few faint high clouds;
 *                below the horizon the colour of the far ground in the haze
 *   the light    the sun (a warm key with its shadow, from where it stands), the sky's own light on everything (the
 *                environment: the same sky, blurred), and a soft fill from the front
 *   the horizon  one function, `skyHorizon`, for the dome and every floor: a floor fades with distance into exactly
 *                the colour of the sky behind it, so the ground meets the sky in a horizon and not a wall of fog
 *
 * Everything is the same for every asset (a plant, a machine, a building): `daySky(renderer)` → { dome, sunDir,
 * environment, horizon, uniforms, glsl, place(camera), dispose }.
 */
import * as THREE from 'three';

/** where the sun stands: its bearing (degrees, from +Z toward +X; the viewer's camera first looks from ~38°) and height */
const SUN = { bearing: 218, height: 14 };

/** the sun's direction, a unit vector from the asset toward it */
export const sunDirection = () => {
	const a = THREE.MathUtils.degToRad(SUN.bearing), e = THREE.MathUtils.degToRad(SUN.height);
	return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
};

/** the sky's colours (linear, HDR where they glow): what the dome, the environment and the floors share */
const colours = () => ({
	uZenith: { value: new THREE.Color('#5a8ccc').convertSRGBToLinear() },
	uHigh: { value: new THREE.Color('#9dbfe3').convertSRGBToLinear() },
	uLow: { value: new THREE.Color('#dde7ee').convertSRGBToLinear() },
	uGold: { value: new THREE.Color('#fff3df').convertSRGBToLinear() },
	uAway: { value: new THREE.Color('#d4e0ea').convertSRGBToLinear() },
	uGround: { value: new THREE.Color('#a7a294').convertSRGBToLinear() },
	uSunC: { value: new THREE.Color('#fff1d6').convertSRGBToLinear() },
	uSun: { value: sunDirection() },
	/** how bright the sky is drawn (the dome; the environment takes its own) */
	uSkyK: { value: 1 }
});

/**
 * The sky as GLSL: `skyColour(dir)` for any way looked (the dome), `skyHorizon(dir)` the colour on the horizon under
 * it (the floors fade into it). `dir` unit, world space.
 */
const SKY_GLSL = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHigh; uniform vec3 uLow; uniform vec3 uGold; uniform vec3 uAway; uniform vec3 uGround;
uniform vec3 uSunC; uniform vec3 uSun; uniform float uSkyK;
float skH(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float skN(vec3 p) {
	vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(skH(i), skH(i + vec3(1, 0, 0)), f.x), mix(skH(i + vec3(0, 1, 0)), skH(i + vec3(1, 1, 0)), f.x), f.y),
		mix(mix(skH(i + vec3(0, 0, 1)), skH(i + vec3(1, 0, 1)), f.x), mix(skH(i + vec3(0, 1, 1)), skH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// how much a way looked faces the sun's bearing, level (1 toward it, -1 away)
float skToward(vec3 dir) { vec2 a = normalize(dir.xz + 1e-5), b = normalize(uSun.xz + 1e-5); return dot(a, b); }
// the colour on the horizon under a way looked: a light haze, a little warmer and brighter toward the sun
vec3 skyHorizon(vec3 dir) {
	float t = skToward(dir);
	vec3 c = mix(uAway, uLow, smoothstep(-1.0, 0.2, t));
	c = mix(c, uGold * 1.05, pow(max(t, 0.0), 4.0) * 0.25);
	return c * uSkyK;
}
vec3 skyColour(vec3 dir) {
	float y = dir.y;
	float t = skToward(dir);
	vec3 h = skyHorizon(dir) / max(uSkyK, 1e-4);
	// up the sky: the horizon's colour into pale blue, into the zenith's deeper blue (lighter toward the sun)
	vec3 c = mix(h, uHigh, smoothstep(0.0, 0.3, y));
	c = mix(c, uZenith, smoothstep(0.2, 0.95, y));
	// the glow round the sun: wide and gold, then tight and white-hot
	float cosA = dot(dir, uSun);
	float glow = pow(max(cosA, 0.0), 16.0) * 0.12 + pow(max(cosA, 0.0), 200.0) * 0.5 + pow(max(cosA, 0.0), 2000.0) * 3.0;
	c += uGold * glow;
	// a few faint high clouds in streaks, thinning toward the horizon and the zenith
	if (y > 0.0) {
		vec2 q = dir.xz / (y + 0.12);
		float n = skN(vec3(q * vec2(1.1, 3.4), 1.7)) * 0.62 + skN(vec3(q * vec2(2.6, 7.8), 5.3)) * 0.38;
		float cloud = smoothstep(0.56, 0.82, n) * smoothstep(0.03, 0.14, y) * (1.0 - smoothstep(0.55, 0.9, y));
		c = mix(c, vec3(1.0, 1.0, 0.99) * (0.95 + 0.15 * max(t, 0.0)), cloud * 0.3);
	}
	// the sun's disc, a little over half a degree across, bright enough to bloom
	c += uSunC * smoothstep(0.99992, 0.99996, cosA) * 20.0;
	// under the horizon: the far ground in the haze, darker as it comes nearer
	if (y < 0.0) c = mix(h, uGround * (0.75 + 0.25 * max(t, 0.0)), smoothstep(0.0, 0.25, -y));
	return c * uSkyK;
}
`;

/** the dome's material: drawn at the far plane, behind everything, round wherever the eye is */
function domeMaterial(u) {
	return new THREE.ShaderMaterial({
		uniforms: u,
		vertexShader: /* glsl */ `varying vec3 vDir;
			void main() {
				vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
				vec4 p = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position, 1.0)).xyz, 1.0);
				gl_Position = p.xyww;
				gl_Position.z = gl_Position.w * 0.99999;
			}`,
		fragmentShader: /* glsl */ `${SKY_GLSL}
			varying vec3 vDir;
			void main() { gl_FragColor = vec4(skyColour(normalize(vDir)), 1.0); }`,
		side: THREE.BackSide,
		depthWrite: false,
		toneMapped: true
	});
}

/**
 * The afternoon sky for a stage.
 * @param {THREE.WebGLRenderer} renderer
 */
export function daySky(renderer) {
	const uniforms = colours();
	const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), domeMaterial(uniforms));
	dome.name = 'sky';
	dome.frustumCulled = false;
	dome.renderOrder = -10;
	dome.userData.studio = true;
	dome.userData.noAO = true;
	// the environment: the same sky, its sun softened (a reflection of a disc that bright would sparkle on every leaf)
	const envU = colours();
	envU.uSkyK.value = 0.9;
	const envDome = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), domeMaterial(envU));
	envDome.material.fragmentShader = envDome.material.fragmentShader.replace('* 20.0', '* 0.0');
	const s = new THREE.Scene();
	s.add(envDome);
	// the ground under the environment's sky: what light bounces up from the ground
	const ground = new THREE.Mesh(new THREE.CircleGeometry(10, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8f8a7c').convertSRGBToLinear().multiplyScalar(0.6) }));
	ground.position.y = -0.4;
	s.add(ground);
	const pm = new THREE.PMREMGenerator(renderer);
	const environment = pm.fromScene(s, 0.035).texture;
	pm.dispose();
	envDome.geometry.dispose();
	envDome.material.dispose();
	ground.geometry.dispose();
	ground.material.dispose();
	return {
		dome,
		sunDir: uniforms.uSun.value.clone(),
		environment,
		/** the sky's uniforms and GLSL, for a floor that fades into the horizon (`skyHorizon(dir)`) */
		uniforms,
		glsl: SKY_GLSL,
		/** each frame before drawing: the dome round the eye, within its far plane @param {THREE.PerspectiveCamera} camera */
		place(camera) {
			dome.position.copy(camera.position);
			dome.scale.setScalar(camera.far * 0.5);
			dome.updateMatrixWorld();
		},
		dispose() {
			dome.geometry.dispose();
			dome.material.dispose();
			environment.dispose();
		}
	};
}
