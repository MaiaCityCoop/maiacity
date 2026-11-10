/*
 * The grass's WebGPU shaders built to WGSL without a GPU (intent e85a5860): its three compute passes (the counts
 * cleared, the trample map stepped, the blades chosen) and its three indirect levels' vertex and fragment shaders,
 * by three's own WGSL builder against a renderer that only answers what it asks, so a shader that would not build
 * fails here and not on the Mac. `bun scripts/grass-wgsl.ts [--print]`: exits 0 when every one builds; --print shows
 * them. Where `naga` is installed (cargo install naga-cli) each is held to the WGSL grammar too.
 */
import * as THREE from 'three';
import { WGSLNodeBuilder, WebGPURenderer } from 'three/webgpu';
import { grassCompute } from '../src/lib/content/render/nodes/grass-compute.js';

(globalThis as any).ImageBitmap ??= class {};
const canvas: any = { width: 1440, height: 900, style: {}, addEventListener() {}, removeEventListener() {}, getContext: () => null };
// three's own WebGPURenderer, never initialised (no device is asked for): its library, its nodes and its builder's
// questions answered as WebGPU's backend answers them
const renderer: any = new WebGPURenderer({ canvas });
renderer.backend.device = { features: new Set(), limits: { maxComputeWorkgroupsPerDimension: 65535 } };
renderer.hasFeature = () => false;
renderer._bindings = undefined;
renderer.backend.hasFeature = () => false;
const field: any = grassCompute(renderer, { at: () => ({ grass: 1, tall: 0.3, y: 0 }), device: 'desktop' });
let calls: any[] = [];
renderer.compute = (node: any) => calls.push(node);
const cam = new THREE.PerspectiveCamera(60, 1.6, 0.1, 500);
cam.position.set(0, 1.7, 0);
cam.lookAt(5, 1, 5);
cam.updateMatrixWorld();
field.update(cam, 0, { budget: Infinity });
let ok = true;
const print = process.argv.includes('--print');
const naga = Bun.which('naga');
async function hold(name: string, code: string) {
	if (print) console.log(`// ${name}\n${code}`);
	if (!naga) return;
	const file = `${process.env.TMPDIR ?? '/tmp'}/grass-${name.replace(/\W+/g, '-')}.wgsl`;
	await Bun.write(file, code);
	const r = Bun.spawnSync([naga, file], { stdout: 'pipe', stderr: 'pipe' });
	if (!r.success) (ok = false), console.error(`${name}: not valid WGSL\n`, String(r.stderr).slice(0, 3000));
	else console.log(`${name}: valid WGSL (naga)`);
}
for (const [k, node] of calls.entries()) {
	try {
		// as three's NodeManager.getForCompute builds one
		const b: any = new WGSLNodeBuilder(null, renderer);
		b.compute = node;
		b.build();
		console.log(`compute ${k}: ${b.computeShader.split('\n').length} lines`);
		await hold(`compute ${k}`, b.computeShader);
	} catch (e) {
		ok = false;
		console.error(`compute ${k}:`, e);
	}
}
for (const mesh of [...field.object.children]) {
	try {
		// as three's NodeManager._createNodeBuilder builds one, a sun lighting the scene
		const scene = new THREE.Scene(), sun = new THREE.DirectionalLight(0xffffff, 3);
		sun.position.set(3, 8, 2);
		scene.add(sun, new THREE.HemisphereLight(0xbcd4ff, 0x445533, 0.5), mesh);
		const b: any = new WGSLNodeBuilder(mesh, renderer);
		b.scene = scene;
		b.material = mesh.material;
		b.camera = cam;
		b.context.material = mesh.material;
		b.lightsNode = renderer.lighting.getNode(scene, cam);
		b.lightsNode.setLights([sun, scene.children[1]]);
		b.build();
		console.log(`level ${mesh.userData.level}: vertex ${b.vertexShader.split('\n').length} lines, fragment ${b.fragmentShader.split('\n').length} lines`);
		await hold(`L${mesh.userData.level} vertex`, b.vertexShader);
		await hold(`L${mesh.userData.level} fragment`, b.fragmentShader);
	} catch (e) {
		ok = false;
		console.error(`level ${mesh.userData.level}:`, e);
	}
}
process.exit(ok ? 0 : 1);
