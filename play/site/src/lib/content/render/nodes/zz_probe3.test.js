import * as THREE from 'three'; import { WebGLNodesHandler } from 'three/addons/tsl/WebGLNodesHandler.js';
function glslOf(material) {
	globalThis.ImageBitmap ??= class {};
	const gl = new Proxy({}, { get: (_, k) => (k === 'getParameter' ? () => 16 : k === 'getExtension' ? () => ({}) : k === 'getSupportedExtensions' ? () => [] : typeof k === 'string' && /^[A-Z_0-9]+$/.test(k) ? 1 : () => null) });
	const renderer = {
		getContext: () => gl, extensions: { has: () => true, get: () => ({}) }, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace,
		info: { render: { frame: 0 } }, properties: { has: () => false }, getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
		shadowMap: { enabled: true, type: THREE.PCFShadowMap }, localClippingEnabled: false, coordinateSystem: THREE.WebGLCoordinateSystem, getOutputRenderTarget: () => null,
		xr: { enabled: false, isPresenting: false }, getPixelRatio: () => 1, getDrawingBufferSize: (v) => v.set(800, 600), getSize: (v) => v.set(800, 600),
		debug: { checkShaderErrors: true, diagnostics: { keywords: false } }
	};
	const h = new WebGLNodesHandler();
	h.setRenderer(renderer);
	const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
	const sun = new THREE.DirectionalLight();
	sun.castShadow = true;
	scene.add(mesh, sun, new THREE.HemisphereLight());
	scene.fog = new THREE.Fog('#ffffff', 10, 100);
	h.renderStart(scene, camera);
	h.updateLights([sun]);
	const p = {};
	h.build(material, mesh, p);
	return p;
}
import { it } from 'vitest';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { applyGraph } from './graph.js';
it('per-output rebuild', () => {
  const nodes = [{ op: 'positionWorld' }];
  let layer = []; for (let i = 0; i < 120; i++) { nodes.push({ op: 'worley', in: [0] }); layer.push(nodes.length - 1); }
  while (layer.length > 1) { const nx = []; for (let i = 0; i < layer.length; i += 2) { if (i + 1 < layer.length) { nodes.push({ op: 'add', in: [layer[i], layer[i + 1]] }); nx.push(nodes.length - 1); } else nx.push(layer[i]); } layer = nx; }
  const last = nodes.length - 1;
  for (const outs of [{ roughness: last }, { roughness: last, metalness: last, opacity: last, color: last, emissive: last }]) {
    const p = glslOf(applyGraph(new MeshStandardNodeMaterial(), { format: 1, nodes, out: outs }));
    const f = p.fragmentShader; const names = [...new Set(f.match(/mx_worley\w*/g) || [])];
    const fns=[...f.matchAll(/\b(\w+)\s*\(/g)].map(x=>x[1]); const cnt={}; for(const x of fns) cnt[x]=(cnt[x]||0)+1; console.log(Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,6)); console.log(Object.keys(outs).length, 'outputs: frag len', f.length, 'fn names', names.join(','), 'calls', (f.match(/mx_worley_noise_float\w*\s*\(/g) || []).length);
  }
});
it('build time per distinct max graph', () => {
  const mk = (seed) => { const nodes = [{ op: 'positionWorld' }, { op: 'float', value: seed }, { op: 'add', in: [0, 1] }];
    let layer = []; for (let i = 0; i < 120; i++) { nodes.push({ op: 'worley', in: [2] }); layer.push(nodes.length - 1); }
    while (layer.length > 1) { const nx = []; for (let i = 0; i < layer.length; i += 2) { if (i + 1 < layer.length) { nodes.push({ op: 'add', in: [layer[i], layer[i + 1]] }); nx.push(nodes.length - 1); } else nx.push(layer[i]); } layer = nx; }
    const last = nodes.length - 1; return { format: 1, nodes, out: { roughness: last, metalness: last, opacity: last, color: last, emissive: last, position: last } }; };
  const t = performance.now(); const seen = new Set();
  for (let s = 0; s < 20; s++) { const p = glslOf(applyGraph(new MeshStandardNodeMaterial(), mk(s / 7))); seen.add(p.fragmentShader); }
  console.log('20 distinct graphs', (performance.now() - t).toFixed(0), 'ms; distinct frag sources', seen.size);
});
