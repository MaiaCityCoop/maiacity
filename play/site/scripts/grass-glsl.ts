/*
 * The grass's node material compiled to GLSL without a GPU (intent 090168c8): three's own WebGL nodes handler and its
 * GLSL builder, run against a renderer that only answers what they ask, so a shader that would not build fails here
 * and not on the Mac. `bun scripts/grass-glsl.ts [--print]`: exits 0 when every level's vertex and fragment shaders
 * build; --print shows them.
 */
import * as THREE from 'three';
import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';
import { GRASS, DEVICES, levelGeometry } from '../src/lib/content/biomes/grass.js';
import { grassMaterial, grassUniforms } from '../src/lib/content/render/nodes/grass.js';

(globalThis as any).ImageBitmap ??= class {};
const gl = new Proxy({} as Record<string, unknown>, {
	get: (t, p) => (p in t ? t[p as string] : typeof p === 'string' && /^[A-Z_0-9]+$/.test(p) ? 1 : () => 16)
});
const renderer: any = {
	extensions: { has: () => true, get: () => ({}) },
	getContext: () => gl,
	info: { render: { frame: 0 } },
	toneMapping: THREE.NoToneMapping,
	outputColorSpace: THREE.SRGBColorSpace,
	getRenderTarget: () => null,
	getDrawingBufferSize: (v: THREE.Vector2) => v.set(1440, 900),
	getSize: (v: THREE.Vector2) => v.set(1440, 900),
	getPixelRatio: () => 1,
	coordinateSystem: THREE.WebGLCoordinateSystem,
	properties: { has: () => false },
	shadowMap: { enabled: true, type: THREE.PCFShadowMap },
	debug: { checkShaderErrors: true, diagnostics: { keywords: false } }
};
const handler = new WebGLNodesHandler();
handler.setRenderer(renderer);
const scene = new THREE.Scene();
// the sky's own sun (sandbox-kit/sky.js: a SunLight, its node registered as #2's fix does, so node materials are lit by it)
const { SunLight } = await import('three/addons/lights/SunLight.js');
const { SunLightNode } = await import('three/addons/lights/SunLightNode.js');
SunLight.registerNode(SunLightNode);
const sky = new SunLight(0xffffff, 3);
sky.position.set(1, 2, 1);
// and a DirectionalLight casting a shadow (the stub has no cascades to give a SunLight's), so receiving one is built too
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.shadow.map = new THREE.WebGLRenderTarget(16, 16, { depthTexture: new THREE.DepthTexture(16, 16) });
(sun.shadow.map.depthTexture as THREE.DepthTexture).compareFunction = THREE.LessEqualCompare;
sun.castShadow = true;
scene.add(sun, sky, new THREE.HemisphereLight());
scene.fog = new THREE.Fog(0xcccccc, 10, 200);
const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 1000);
const U = grassUniforms(new THREE.DataTexture(new Uint16Array(4), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType));
let ok = true;
// the world's one wind, render/wind.js's own `windNodes` (intent 6fd5e63f)
const { windNodes } = await import('../src/lib/content/render/wind.js');
const wind = windNodes(await import('three/tsl'));
for (const [level, withWind] of [[0, false], [1, false], [2, false], [0, true]] as const) {
	const mat = grassMaterial({ level, uniforms: U, params: GRASS, device: DEVICES.desktop, wind: withWind ? wind : undefined });
	const mesh = new THREE.Mesh(levelGeometry(level), mat);
	mesh.receiveShadow = true;
	handler.renderStart(scene, camera);
	handler.updateLights?.([sun, sky, ...scene.children.filter((c) => (c as THREE.Light).isHemisphereLight)]);
	const params: any = {};
	try {
		handler.build(mat, mesh, params);
		const v: string = params.vertexShader, f: string = params.fragmentShader;
		if (!(mat as any).isKit) (ok = false), console.error(`level ${level}: not drawn as the kit's (isKit): toned twice in a film's targets`);
		if (!/directionalLight|sunLight|SunLight/i.test(f) && !/NdotL|dotNL/.test(f)) console.warn(`level ${level}: no sun in its fragment shader`);
		console.log(`level ${level}${withWind ? ' in the world’s wind' : ''}: vertex ${v.split('\n').length} lines, fragment ${f.split('\n').length} lines`);
		if (process.argv.includes('--print')) console.log(v, '\n-----\n', f);
		// held to the GLSL ES 3.00 grammar where glslangValidator is installed (apt glslang-tools)
		const head = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\n';
		for (const [stage, src] of [['vert', v], ['frag', f]] as const) {
			const file = `${process.env.TMPDIR ?? '/tmp'}/grass-L${level}${withWind ? 'w' : ''}.${stage}`;
			await Bun.write(file, head + src);
			const r = Bun.spawnSync(['glslangValidator', '-S', stage, file], { stdout: 'pipe', stderr: 'pipe' });
			if (r.exitCode === null && !r.success && String(r.stderr).includes('ENOENT')) continue;
			if (!r.success) {
				ok = false;
				console.error(`level ${level} ${stage}:`, String(r.stdout).slice(0, 2000));
			} else console.log(`level ${level} ${stage}: valid GLSL ES 3.00`);
		}
	} catch (e) {
		ok = false;
		console.error(`level ${level}:`, e);
	}
	handler.renderEnd();
}
process.exit(ok ? 0 : 1);
