Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let three = require("three");
three = __toESM(three, 1);
let three_addons_geometries_RoundedBoxGeometry_js = require("three/addons/geometries/RoundedBoxGeometry.js");
let three_addons_utils_BufferGeometryUtils_js = require("three/addons/utils/BufferGeometryUtils.js");
three_addons_utils_BufferGeometryUtils_js = __toESM(three_addons_utils_BufferGeometryUtils_js, 1);

//#region src/lib/assets/kit.js
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = {
	lin: (t) => t,
	io: (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
	in: (t) => t * t * t,
	out: (t) => 1 - Math.pow(1 - t, 3),
	expo: (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
	back: (t) => {
		return 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
	}
};
/** first order lag toward target with time constant tau (s): spool-up, thermal mass, filters */
const approach = (v, target, tau, dt) => target + (v - target) * Math.exp(-dt / Math.max(1e-6, tau));
/** piecewise linear table lookup: xs ascending */
function table(xs, ys, x) {
	if (x <= xs[0]) return ys[0];
	for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1]));
	return ys[ys.length - 1];
}
/** number formatting with thin grouping: fmt(144712) = "144,712", fmt(3.14159, 2) = "3.14" */
function fmt(v, digits = 0) {
	if (!isFinite(v)) return "--";
	return v.toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
/** seeded random, so films are deterministic */
function rng(seed = 1) {
	let s = seed >>> 0 || 1;
	return () => {
		s = s * 1664525 + 1013904223 >>> 0;
		return s / 4294967296;
	};
}
function canvasTex(size, draw, { repeat = [1, 1], color = false } = {}) {
	if (typeof document === "undefined") return new three.Texture();
	const c = document.createElement("canvas");
	c.width = c.height = size;
	draw(c.getContext("2d"), size);
	const t = new three.CanvasTexture(c);
	t.wrapS = t.wrapT = three.RepeatWrapping;
	t.repeat.set(repeat[0], repeat[1]);
	t.anisotropy = 8;
	t.colorSpace = color ? three.SRGBColorSpace : three.NoColorSpace;
	return t;
}
const TEX = {};
function tex(kind) {
	if (TEX[kind]) return TEX[kind];
	const R = rng(kind.length * 977);
	const S = 512;
	const make = {
		turned: (g) => {
			g.fillStyle = "#808080";
			g.fillRect(0, 0, S, S);
			for (let y = 0; y < S; y++) {
				const v = 112 + R() * 40 + Math.sin(y * .9) * 10;
				g.fillStyle = `rgb(${v},${v},${v})`;
				g.fillRect(0, y, S, 1);
			}
		},
		brushed: (g) => {
			g.fillStyle = "#7a7a7a";
			g.fillRect(0, 0, S, S);
			for (let i = 0; i < 2600; i++) {
				const v = 90 + R() * 80;
				g.fillStyle = `rgba(${v},${v},${v},0.35)`;
				g.fillRect(R() * S, R() * S, 30 + R() * 220, 1);
			}
		},
		cast: (g) => {
			g.fillStyle = "#808080";
			g.fillRect(0, 0, S, S);
			for (let i = 0; i < 380; i++) {
				const v = 100 + R() * 60, r = 6 + R() * 40;
				const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
				gr.addColorStop(0, `rgba(${v},${v},${v},0.25)`);
				gr.addColorStop(1, "rgba(128,128,128,0)");
				g.save();
				g.translate(R() * S, R() * S);
				g.fillStyle = gr;
				g.fillRect(-r, -r, 2 * r, 2 * r);
				g.restore();
			}
			const d = g.getImageData(0, 0, S, S);
			for (let i = 0; i < d.data.length; i += 4) {
				const n = (R() - .5) * 26;
				d.data[i] += n;
				d.data[i + 1] += n;
				d.data[i + 2] += n;
			}
			g.putImageData(d, 0, 0);
		},
		carbon: (g) => {
			const n = 16, w = S / n;
			for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
				const on = (i + j >> 1) % 2 === 0;
				const gr = on ? g.createLinearGradient(i * w, 0, i * w + w, 0) : g.createLinearGradient(0, j * w, 0, j * w + w);
				gr.addColorStop(0, "#0d0e10");
				gr.addColorStop(.5, on ? "#3a3d42" : "#2a2c30");
				gr.addColorStop(1, "#0d0e10");
				g.fillStyle = gr;
				g.fillRect(i * w, j * w, w, w);
			}
		},
		knurl: (g) => {
			g.fillStyle = "#000";
			g.fillRect(0, 0, S, S);
			g.strokeStyle = "#fff";
			g.lineWidth = 6;
			for (let i = -512; i < 2 * S; i += 24) {
				g.beginPath();
				g.moveTo(i, 0);
				g.lineTo(i + S, S);
				g.stroke();
				g.beginPath();
				g.moveTo(i, S);
				g.lineTo(i + S, 0);
				g.stroke();
			}
		},
		smudge: (g) => {
			g.fillStyle = "#4a4a4a";
			g.fillRect(0, 0, S, S);
			for (let i = 0; i < 90; i++) {
				const r = 10 + R() * 60, v = 70 + R() * 50;
				const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
				gr.addColorStop(0, `rgba(${v},${v},${v},0.3)`);
				gr.addColorStop(1, "rgba(74,74,74,0)");
				g.save();
				g.translate(R() * S, R() * S);
				g.scale(1, .4 + R());
				g.fillStyle = gr;
				g.fillRect(-r, -r, 2 * r, 2 * r);
				g.restore();
			}
		}
	}[kind];
	TEX[kind] = canvasTex(S, make, { color: kind === "carbon" });
	return TEX[kind];
}
const CUT = /* @__PURE__ */ (() => ({
	a: { value: new three.Vector4(0, 0, -1, 1e5) },
	b: { value: new three.Vector4(0, 0, -1, 1e5) },
	proj: { value: new three.Matrix4() },
	hatch: { value: .012 }
}))();
const ALL_MATS = /* @__PURE__ */ (() => /* @__PURE__ */ new Set())();
/** section face style: 'red' (museum cutaway paint, the default) or 'metal' (the freshly machined material). Set before creating materials: setCaps('metal') */
const CAPS = /* @__PURE__ */ (() => ({
	style: "red",
	red: new three.Color(.56, .085, .045)
}))();
/**
* Patch a standard or physical material so that, while a section cut is open, the back faces
* seen through the opening are drawn as a flat machined cap on the cut plane: plane normal,
* plane depth, the cap colour and a faint hatch. Every solid stays closed, no cap geometry.
*/
function capPatch(m, capColor, capRough = .38, capMetal = null) {
	m.userData.capColor = new three.Color(capColor);
	const uCap = { value: m.userData.capColor };
	const uCapR = { value: capRough };
	const uCapM = { value: capMetal ?? m.metalness };
	m.onBeforeCompile = (sh) => {
		sh.uniforms.uCutA = CUT.a;
		sh.uniforms.uCutB = CUT.b;
		sh.uniforms.uCutProj = CUT.proj;
		sh.uniforms.uHatch = CUT.hatch;
		sh.uniforms.uCapColor = uCap;
		sh.uniforms.uCapRough = uCapR;
		sh.uniforms.uCapMetal = uCapM;
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLabW;").replace("#include <project_vertex>", `#include <project_vertex>
      { vec4 lw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        lw = instanceMatrix * lw;
        #endif
        vLabW = (modelMatrix * lw).xyz; }`);
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vLabW;
      uniform vec4 uCutA; uniform vec4 uCutB; uniform mat4 uCutProj; uniform float uHatch;
      uniform vec3 uCapColor; uniform float uCapRough; uniform float uCapMetal;
      void labClip(vec4 P, vec3 ro, vec3 rd, inout float t0, inout float t1, inout int id, int k) {
        float dn = dot(P.xyz, rd), d0 = dot(P.xyz, ro) + P.w;
        if (abs(dn) < 1e-8) { if (d0 >= 0.0) { t0 = 1.0; t1 = 0.0; } return; }
        float th = -d0 / dn;
        if (dn > 0.0) { if (th < t1) { t1 = th; id = k; } } else t0 = max(t0, th);
      }`).replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      // a back face of a closed solid is only ever seen through the opening the cut made: shade it as the
      // section face (plane normal, cap colour) at its own depth, so ordinary depth testing keeps it honest
      bool labCap = false; vec3 labHit = vLabW; vec3 labN = uCutA.xyz;
      if (!gl_FrontFacing && uCutA.w < 1e4) {
        labCap = true;
        vec3 ro = cameraPosition, toF = vLabW - ro; float tf = length(toF); vec3 rd = toF / max(tf, 1e-6);
        float t0 = 0.0, t1 = 1e9; int id = -1;
        labClip(uCutA, ro, rd, t0, t1, id, 0); labClip(uCutB, ro, rd, t0, t1, id, 1);
        if (id == 1) labN = uCutB.xyz;
        else if (id < 0) labN = abs(dot(uCutA.xyz, vLabW) + uCutA.w) < abs(dot(uCutB.xyz, vLabW) + uCutB.w) ? uCutA.xyz : uCutB.xyz;
        labHit = vLabW - labN * (dot(labN, vLabW) + (id == 1 ? uCutB.w : uCutA.w));
      }`).replace("#include <color_fragment>", `#include <color_fragment>
      if (labCap) {
        float hs = dot(labHit, vec3(0.7071, 0.7071, 0.0)) / uHatch;
        float hl = smoothstep(0.0, 0.08, abs(fract(hs) - 0.5) - 0.42);
        diffuseColor.rgb = uCapColor * (0.94 + 0.06 * hl);
      }`).replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nif (labCap) roughnessFactor = uCapRough;").replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nif (labCap) metalnessFactor = uCapMetal;").replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
      if (labCap) { vec3 nw = normalize(-labN); normal = normalize((viewMatrix * vec4(nw, 0.0)).xyz); if (dot(normal, normalize(vViewPosition)) > 0.0) normal = -normal; }`);
		if (m.userData.extraShader) m.userData.extraShader(sh);
	};
	m.customProgramCacheKey = () => "labcap" + (m.userData.extraKey || "");
	m.side = three.DoubleSide;
	m.shadowSide = three.FrontSide;
	m.clippingPlanes = LAB_PLANES;
	m.clipIntersection = true;
	m.clipShadows = true;
	ALL_MATS.add(m);
	return m;
}
const LAB_PLANES = /* @__PURE__ */ (() => [new three.Plane(new three.Vector3(0, 0, -1), 1e5), new three.Plane(new three.Vector3(0, 0, -1), 1e5)])();
/**
* Material library. Base colours are measured linear reflectances for metals (F0) and
* albedos for dielectrics, so steel looks like steel next to titanium next to copper.
* Every preset takes overrides: any MeshPhysicalMaterial field plus
*   finish: 'turned' | 'brushed' | 'cast' | 'smudge' | 'knurl' | null   (micro roughness texture)
*   rep: [u, v] texture repeat     cap: cap colour     noCap: true for open shells and glass
*/
const MAT = {
	steel: (o) => mat({
		color: [
			.56,
			.57,
			.58
		],
		metalness: 1,
		roughness: .3,
		finish: "turned",
		...o
	}),
	steelDark: (o) => mat({
		color: [
			.24,
			.245,
			.25
		],
		metalness: 1,
		roughness: .42,
		finish: "cast",
		...o
	}),
	stainless: (o) => mat({
		color: [
			.67,
			.66,
			.64
		],
		metalness: 1,
		roughness: .2,
		finish: "brushed",
		...o
	}),
	chrome: (o) => mat({
		color: [
			.78,
			.79,
			.8
		],
		metalness: 1,
		roughness: .06,
		finish: null,
		...o
	}),
	aluminium: (o) => mat({
		color: [
			.88,
			.89,
			.9
		],
		metalness: 1,
		roughness: .38,
		finish: "cast",
		...o
	}),
	aluminiumMachined: (o) => mat({
		color: [
			.9,
			.9,
			.91
		],
		metalness: 1,
		roughness: .22,
		finish: "turned",
		...o
	}),
	anodised: (o) => mat({
		color: o?.color ?? [
			.08,
			.09,
			.1
		],
		metalness: .85,
		roughness: .34,
		finish: "cast",
		clearcoat: .2,
		...o
	}),
	titanium: (o) => mat({
		color: [
			.54,
			.5,
			.45
		],
		metalness: 1,
		roughness: .32,
		finish: "brushed",
		...o
	}),
	inconel: (o) => mat({
		color: [
			.47,
			.44,
			.41
		],
		metalness: 1,
		roughness: .42,
		finish: "cast",
		...o
	}),
	copper: (o) => mat({
		color: [
			.95,
			.64,
			.54
		],
		metalness: 1,
		roughness: .28,
		finish: "turned",
		...o
	}),
	brass: (o) => mat({
		color: [
			.91,
			.78,
			.42
		],
		metalness: 1,
		roughness: .24,
		finish: "turned",
		...o
	}),
	gold: (o) => mat({
		color: [
			1,
			.77,
			.34
		],
		metalness: 1,
		roughness: .18,
		finish: "brushed",
		...o
	}),
	bluedSteel: (o) => mat({
		color: [
			.08,
			.16,
			.5
		],
		metalness: 1,
		roughness: .16,
		finish: null,
		...o
	}),
	castIron: (o) => mat({
		color: [
			.3,
			.3,
			.3
		],
		metalness: .9,
		roughness: .62,
		finish: "cast",
		...o
	}),
	paint: (o) => mat({
		color: o?.color ?? [
			.8,
			.8,
			.8
		],
		metalness: 0,
		roughness: .32,
		clearcoat: .6,
		clearcoatRoughness: .2,
		finish: "smudge",
		...o
	}),
	satin: (o) => mat({
		color: o?.color ?? [
			.04,
			.04,
			.045
		],
		metalness: 0,
		roughness: .55,
		finish: "cast",
		...o
	}),
	plastic: (o) => mat({
		color: o?.color ?? [
			.05,
			.05,
			.055
		],
		metalness: 0,
		roughness: .42,
		finish: "cast",
		...o
	}),
	rubber: (o) => mat({
		color: [
			.025,
			.025,
			.027
		],
		metalness: 0,
		roughness: .82,
		finish: "cast",
		...o
	}),
	ceramic: (o) => mat({
		color: [
			.82,
			.8,
			.76
		],
		metalness: 0,
		roughness: .5,
		finish: "cast",
		...o
	}),
	carbon: (o) => mat({
		color: [
			1,
			1,
			1
		],
		map: tex("carbon"),
		metalness: .2,
		roughness: .36,
		clearcoat: 1,
		clearcoatRoughness: .05,
		finish: null,
		rep: [6, 6],
		...o
	}),
	glass: (o) => mat({
		color: [
			1,
			1,
			1
		],
		metalness: 0,
		roughness: .03,
		transmission: 1,
		thickness: .004,
		ior: 1.5,
		transparent: true,
		finish: null,
		noCap: true,
		...o
	}),
	sapphire: (o) => mat({
		color: [
			.96,
			.97,
			1
		],
		metalness: 0,
		roughness: 0,
		transmission: 1,
		thickness: .002,
		ior: 1.77,
		transparent: true,
		finish: null,
		noCap: true,
		...o
	}),
	ruby: (o) => mat({
		color: [
			.9,
			.08,
			.15
		],
		metalness: 0,
		roughness: .05,
		transmission: .6,
		thickness: .001,
		ior: 1.77,
		finish: null,
		...o
	}),
	enamel: (o) => mat({
		color: [
			.93,
			.92,
			.88
		],
		metalness: 0,
		roughness: .12,
		clearcoat: 1,
		clearcoatRoughness: .03,
		finish: null,
		...o
	}),
	fluid: (o) => mat({
		color: o?.color ?? [
			.3,
			.12,
			.05
		],
		metalness: 0,
		roughness: .08,
		clearcoat: 1,
		finish: null,
		...o
	}),
	glow: (o) => mat({
		color: [
			0,
			0,
			0
		],
		emissive: o?.emissive ?? [
			1,
			.5,
			.15
		],
		emissiveIntensity: o?.emissiveIntensity ?? 4,
		metalness: 0,
		roughness: 1,
		finish: null,
		...o
	})
};
function col(c) {
	return Array.isArray(c) ? new three.Color(c[0], c[1], c[2]) : new three.Color(c);
}
/** build a material from a preset description (see MAT) */
function mat(o) {
	const { finish, rep, cap, noCap, capRough, color, emissive, ...rest } = o;
	const m = new three.MeshPhysicalMaterial({ ...rest });
	m.color = col(color ?? [
		.8,
		.8,
		.8
	]);
	if (emissive !== void 0) m.emissive = col(emissive);
	if (finish) {
		const t = tex(finish).clone();
		t.needsUpdate = true;
		t.repeat.set(...rep ?? (finish === "turned" ? [1, 24] : finish === "brushed" ? [2, 6] : [3, 3]));
		m.roughnessMap = t;
		if (finish === "knurl") {
			m.bumpMap = t;
			m.bumpScale = .6;
		}
	}
	m.envMapIntensity = rest.envMapIntensity ?? 1;
	if (noCap) {
		m.side = three.FrontSide;
		m.clippingPlanes = LAB_PLANES;
		m.clipIntersection = true;
		m.clipShadows = true;
		ALL_MATS.add(m);
		return m;
	}
	const metalCap = m.metalness > .5 ? m.color.clone().lerp(new three.Color(.8, .8, .8), .35) : m.color.clone().multiplyScalar(.9);
	return capPatch(m, cap !== void 0 ? col(cap) : CAPS.style === "metal" ? metalCap : CAPS.red.clone(), capRough ?? (CAPS.style === "metal" ? .36 : .55), CAPS.style === "metal" && m.metalness > .5 ? 1 : 0);
}
const GEO = {
	/**
	* closed solid of revolution around +Y from [r, y] points (a closed profile; the last point joins the first).
	* Any winding works (it is made counter clockwise so faces point out), and corners sharper than
	* `crease` degrees stay crisp while gentle curves shade smooth.
	*/
	lathe(pts, seg = 96, { crease = 32, phi0 = 0, phiLen = Math.PI * 2 } = {}) {
		let p = pts.map(([r, y]) => new three.Vector2(Math.max(0, r), y));
		if (p[0].distanceTo(p[p.length - 1]) < 1e-9) p.pop();
		let area = 0;
		for (let i = 0; i < p.length; i++) {
			const a = p[i], b = p[(i + 1) % p.length];
			area += a.x * b.y - b.x * a.y;
		}
		if (area < 0) p.reverse();
		const cosT = Math.cos(three.MathUtils.degToRad(crease)), n0 = p.length;
		const isCrease = (i) => {
			const a = p[(i - 1 + n0) % n0], b = p[i], c = p[(i + 1) % n0];
			return b.clone().sub(a).normalize().dot(c.clone().sub(b).normalize()) < cosT;
		};
		let s0 = 0;
		for (let i = 0; i < n0; i++) if (isCrease(i)) {
			s0 = i;
			break;
		}
		p = [...p.slice(s0), ...p.slice(0, s0)];
		const out = [p[0].clone()];
		for (let i = 1; i < n0; i++) {
			out.push(p[i].clone());
			if (isCrease(i)) out.push(p[i].clone());
		}
		out.push(p[0].clone());
		const g = new three.LatheGeometry(out, seg, phi0, phiLen);
		g.computeVertexNormals();
		if (phiLen >= Math.PI * 2 - 1e-6) {
			const n = g.attributes.normal, P = out.length;
			for (let j = 0; j < P; j++) {
				const a = j, b = seg * P + j;
				const v = new three.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
				n.setXYZ(a, v.x, v.y, v.z);
				n.setXYZ(b, v.x, v.y, v.z);
			}
		}
		return g;
	},
	/**
	* a wall of thickness t following an open profile [[r, y], ...] (a nozzle, a casing, a cowl):
	* the outer line, then the same line offset inward, closed at both ends. Real solids cut cleanly.
	*/
	shell(pts, t, seg = 96, inward = true) {
		const out = pts.map((p) => new three.Vector2(p[0], p[1]));
		const inn = out.map((p, i) => {
			const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
			const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
			const nx = ty / l, ny = -tx / l;
			const s = inward ? -1 : 1;
			return new three.Vector2(Math.max(0, p.x + s * nx * t), p.y + s * ny * t);
		});
		return GEO.lathe([...out.map((v) => [v.x, v.y]), ...inn.reverse().map((v) => [v.x, v.y])], seg);
	},
	/** hollow cylinder along +Y */
	tube(rOut, rIn, h, seg = 96, y0 = -h / 2) {
		return GEO.lathe([
			[rIn, y0],
			[rOut, y0],
			[rOut, y0 + h],
			[rIn, y0 + h]
		], seg);
	},
	/** cylinder with chamfered edges along +Y */
	disc(r, h, ch = Math.min(r, h) * .08, seg = 96, rIn = 0) {
		return GEO.lathe([
			[rIn, -h / 2],
			[r - ch, -h / 2],
			[r, -h / 2 + ch],
			[r, h / 2 - ch],
			[r - ch, h / 2],
			[rIn, h / 2]
		], seg);
	},
	rbox(w, h, d, r = Math.min(w, h, d) * .08, s = 4) {
		return new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, s, r);
	},
	/** spur or helical gear around +Z, with an involute-like tooth (enough for a convincing mesh), centred on z */
	gear({ teeth = 24, module = .002, width = .008, bore = 0, helix = 0, rim = 0, spokes = 0 } = {}) {
		const rp = teeth * module / 2, ra = rp + module, rf = rp - 1.25 * module;
		const da = Math.PI * 2 / teeth, steps = 6;
		const hw = (r) => da * lerp(.31, .13, Math.pow(clamp((r - rf) / (ra - rf)), .85));
		const pts = [];
		for (let i = 0; i < teeth; i++) {
			const c = (i + .5) * da;
			pts.push([rf, i * da]);
			for (let k = 0; k <= steps; k++) {
				const r = lerp(rf, ra, k / steps);
				pts.push([r, c - hw(r)]);
			}
			for (let k = 1; k < 3; k++) pts.push([ra, c - hw(ra) + 2 * hw(ra) * k / 3]);
			for (let k = steps; k >= 0; k--) {
				const r = lerp(rf, ra, k / steps);
				pts.push([r, c + hw(r)]);
			}
		}
		const sh = new three.Shape();
		pts.forEach(([r, a], k) => {
			const x = r * Math.cos(a), y = r * Math.sin(a);
			k ? sh.lineTo(x, y) : sh.moveTo(x, y);
		});
		sh.closePath();
		if (bore > 0) {
			const h = new three.Path();
			h.absarc(0, 0, bore, 0, Math.PI * 2, true);
			sh.holes.push(h);
		}
		if (spokes > 0 && rim > 0) {
			const ri = rf - rim, rh = Math.max(bore * 1.9, rp * .28);
			for (let s = 0; s < spokes; s++) {
				const w = .22 * (rp / Math.max(ri, 1e-6));
				const a0 = s / spokes * Math.PI * 2 + w, a1 = (s + 1) / spokes * Math.PI * 2 - w;
				const h = new three.Path();
				h.absarc(0, 0, ri, a0, a1, false);
				h.absarc(0, 0, rh, a1 - w * .4, a0 + w * .4, true);
				h.closePath();
				sh.holes.push(h);
			}
		}
		const g = new three.ExtrudeGeometry(sh, {
			depth: width,
			bevelEnabled: true,
			bevelThickness: module * .15,
			bevelSize: module * .12,
			bevelSegments: 2,
			curveSegments: 24,
			steps: helix ? 6 : 1
		});
		g.translate(0, 0, -width / 2);
		if (helix) {
			const p = g.attributes.position;
			for (let i = 0; i < p.count; i++) {
				const a = p.getZ(i) / width * helix, x = p.getX(i), y = p.getY(i);
				p.setXY(i, x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));
			}
			g.computeVertexNormals();
		}
		g.userData.pitchRadius = rp;
		return g;
	},
	/**
	* one blade as a closed cambered, twisted airfoil solid, spanning radius r0..r1 along +Y,
	* chord along the axis (Z) by default. twist in rad root to tip, chord can be [root, tip].
	*/
	blade({ r0 = .1, r1 = .5, chord = .08, thick = .08, camber = .06, twist = .6, pitch = .4, sweep = 0, nS = 14, nC = 16, lean = 0 } = {}) {
		const c0 = Array.isArray(chord) ? chord[0] : chord, c1 = Array.isArray(chord) ? chord[1] : chord;
		const pos = [], idx = [];
		const ring = nC * 2;
		for (let s = 0; s <= nS; s++) {
			const u = s / nS, r = lerp(r0, r1, u), c = lerp(c0, c1, u), ang = pitch + twist * (u - .5) * -1;
			const tk = Array.isArray(thick) ? lerp(thick[0], thick[1], u) : thick, cb = Array.isArray(camber) ? lerp(camber[0], camber[1], u) : camber;
			for (let k = 0; k < ring; k++) {
				const top = k < nC, x = (top ? k : ring - 1 - k) / (nC - 1);
				const th = 5 * tk * (.2969 * Math.sqrt(x) - .126 * x - .3516 * x * x + .2843 * x ** 3 - .1036 * x ** 4);
				const yy = (4 * cb * x * (1 - x) + (top ? th : -th)) * c, xx = (x - .35) * c;
				const z = xx * Math.cos(ang) - yy * Math.sin(ang) + sweep * u * u;
				const tx = xx * Math.sin(ang) + yy * Math.cos(ang) + lean * u * u;
				pos.push(tx, r, z);
			}
		}
		for (let s = 0; s < nS; s++) for (let k = 0; k < ring; k++) {
			const a = s * ring + k, b = s * ring + (k + 1) % ring, c = a + ring, d = b + ring;
			idx.push(a, c, b, b, c, d);
		}
		const cap = (s, flip) => {
			const base = s * ring, cIdx = pos.length / 3;
			let cx = 0, cy = 0, cz = 0;
			for (let k = 0; k < ring; k++) {
				cx += pos[(base + k) * 3];
				cy += pos[(base + k) * 3 + 1];
				cz += pos[(base + k) * 3 + 2];
			}
			pos.push(cx / ring, cy / ring, cz / ring);
			for (let k = 0; k < ring; k++) {
				const a = base + k, b = base + (k + 1) % ring;
				flip ? idx.push(cIdx, b, a) : idx.push(cIdx, a, b);
			}
		};
		cap(0, false);
		cap(nS, true);
		const g = new three.BufferGeometry();
		g.setAttribute("position", new three.Float32BufferAttribute(pos, 3));
		g.setIndex(idx);
		g.computeVertexNormals();
		const uv = [];
		for (let i = 0; i < pos.length / 3; i++) uv.push(i % ring / ring, Math.floor(i / ring) / nS);
		g.setAttribute("uv", new three.Float32BufferAttribute(uv, 2));
		return g;
	},
	/**
	* a bladed row: n blades around an axis. axis 'z' = blades radial in XY, chord along Z.
	* axis 'y' = blades radial in XZ, chord along Y (an engine built along Y). Same options as blade().
	*/
	rotor({ count = 24, axis = "y", phase = 0, ...b } = {}) {
		const one = GEO.blade(b);
		if (axis === "y") one.applyMatrix4(new three.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1));
		if (axis === "x") one.applyMatrix4(new three.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
		return count === 1 ? one : GEO.ring(one, count, axis, phase);
	},
	/** volume (m3) and centroid of a closed mesh: for real masses (m = rho V) and inertias */
	volume(geo) {
		const p = geo.attributes.position, idx = geo.index ? geo.index.array : null, n = idx ? idx.length : p.count;
		let V = 0;
		const c = new three.Vector3(), a = new three.Vector3(), b = new three.Vector3(), d = new three.Vector3();
		for (let i = 0; i < n; i += 3) {
			const i0 = idx ? idx[i] : i, i1 = idx ? idx[i + 1] : i + 1, i2 = idx ? idx[i + 2] : i + 2;
			a.fromBufferAttribute(p, i0);
			b.fromBufferAttribute(p, i1);
			d.fromBufferAttribute(p, i2);
			const v = a.dot(b.clone().cross(d)) / 6;
			V += v;
			c.addScaledVector(a.clone().add(b).add(d), v / 4);
		}
		return {
			V: Math.abs(V),
			centroid: c.divideScalar(V || 1)
		};
	},
	/** n copies of a geometry rotated around an axis ('y' or 'z'), merged */
	ring(geo, n, axis = "z", phase = 0) {
		const out = [];
		for (let i = 0; i < n; i++) {
			const g = geo.clone();
			const m = new three.Matrix4();
			const a = phase + i / n * Math.PI * 2;
			axis === "y" ? m.makeRotationY(a) : axis === "x" ? m.makeRotationX(a) : m.makeRotationZ(a);
			g.applyMatrix4(m);
			out.push(g);
		}
		return three_addons_utils_BufferGeometryUtils_js.mergeGeometries(out);
	},
	merge(list) {
		return three_addons_utils_BufferGeometryUtils_js.mergeGeometries(list.map((g) => g.index ? g.toNonIndexed() : g));
	},
	/** a pipe through points (closed solid wall, ends capped) */
	pipe(points, r, { seg = 64, radial = 16, tension = .5 } = {}) {
		const curve = new three.CatmullRomCurve3(points.map((p) => new three.Vector3(...p)), false, "catmullrom", tension);
		const g = new three.TubeGeometry(curve, seg, r, radial, false);
		const caps = [];
		for (const [t, s] of [[0, -1], [1, 1]]) {
			const c = new three.CircleGeometry(r, radial);
			const tan = curve.getTangentAt(t).multiplyScalar(s);
			c.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 0, 1), tan));
			c.translate(...curve.getPointAt(t).toArray());
			caps.push(c);
		}
		const m = GEO.merge([g, ...caps]);
		m.userData.curve = curve;
		return m;
	},
	/** hex bolt heads (or socket caps) on a circle around +Y at height y, merged */
	bolts(n, R, size, h, { y = 0, socket = false, phase = 0 } = {}) {
		const one = socket ? GEO.lathe([
			[0, 0],
			[size, 0],
			[size, h * .9],
			[size * .92, h],
			[size * .45, h],
			[size * .45, h * .55],
			[0, h * .55]
		], 24) : new three.CylinderGeometry(size, size, h, 6).translate(0, h / 2, 0);
		const out = [];
		for (let i = 0; i < n; i++) {
			const a = phase + i / n * Math.PI * 2;
			out.push(one.clone().translate(R * Math.cos(a), y, R * Math.sin(a)));
		}
		return GEO.merge(out);
	},
	/** coil spring along +Y */
	spring(R, wire, turns, len, seg = 400) {
		const pts = [];
		for (let i = 0; i <= seg; i++) {
			const t = i / seg, a = t * turns * Math.PI * 2;
			pts.push(new three.Vector3(R * Math.cos(a), t * len, R * Math.sin(a)));
		}
		return new three.TubeGeometry(new three.CatmullRomCurve3(pts), seg, wire, 10, false);
	},
	/** extruded 2D outline (THREE.Shape) along +Z, with a small bevel */
	extrude(shape, depth, bevel = depth * .06) {
		const g = new three.ExtrudeGeometry(shape, {
			depth,
			bevelEnabled: bevel > 0,
			bevelThickness: bevel,
			bevelSize: bevel,
			bevelSegments: 2,
			curveSegments: 32
		});
		g.translate(0, 0, -depth / 2);
		g.computeVertexNormals();
		return g;
	}
};

//#endregion
//#region src/lib/assets/parts.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {import('$lib/actors/parts.js').Assembly} Assembly */
/** @typedef {import('$lib/actors/parts.js').PartInfo} PartInfo */
/**
* @typedef {object} How how a part is shown (AirSup's `lab.add` options)
* @property {V3} [explode] which way and how far it moves out in the exploded view (m, in its parent's frame); without
*   it, its assembly's `out` and its distance from the assembly's middle
* @property {number} [delay] 0…1: how late it starts out of the machine (a stagger; without it, spread by its order)
* @property {'shell'} [xray] a shell the x-ray looks through (a casing, a tank wall, a cover)
* @property {{ text?: string, at?: V3, value?: () => string, side?: 'left' | 'right' }} [tag] a label pinned on it: its
*   leader line ends at `at` (in the part's frame), `value` is a live reading under it
*/
/**
* @typedef {object} Part a part as its asset keeps it
* @property {THREE.Object3D} obj
* @property {PartInfo} info
* @property {THREE.Vector3} base where it rests (in its parent's frame)
* @property {THREE.Vector3 | null} off its way out in the exploded view
* @property {number} delay
* @property {number} order
* @property {boolean} [unit] a whole carried asset moving as one (not in the catalog)
*/
/**
* @typedef {object} Label
* @property {THREE.Object3D} obj
* @property {THREE.Vector3} at
* @property {string} text
* @property {(() => string) | undefined} value
* @property {'left' | 'right' | undefined} side
*/
/**
* @typedef {object} Control a slider a viewer shows for a machine's solver (AirSup's `lab.slider`)
* @property {string} label
* @property {number} min
* @property {number} max
* @property {number} value what it is set to now (the solver reads it every tick)
* @property {number} [step]
* @property {string} [unit]
* @property {number} [digits]
* @property {[string, string]} [ends] what its two ends mean
*/
/**
* @typedef {object} Move one of a machine's own moves (what a hand does with it, or what it does): a loop over its
*   controls, played while chosen, by the clock on the wall (Slow slows it, Pause holds it). The viewer's other moves are
*   the stage's own: Run (its solver at the sliders) and Assemble (its parts in by their build steps).
* @property {string} label
* @property {number} seconds one loop
* @property {(u: number) => Record<string, number>} at the controls it sets, `u` 0…1 through the loop
* @property {string} [note] what it shows, in a few words
*/
/**
* @typedef {object} Lab what a machine with a solver shows besides its parts (AirSup's hero, sliders, how and break)
* @property {{ label: string, unit: string, max: number, digits?: number }} hero the one number a viewer cares about
* @property {{ value: number, state: string, sub: string, bad: boolean }} read the hero as the solver last set it
* @property {Record<string, Control>} controls
* @property {Record<string, Move>} [moves] its own moves, by id (a slider a move sets follows it)
* @property {{ text: string, eqs: string[] }} [how] how it is computed: plain words and the equations
* @property {{ label: string, run: (env: Env) => void, reset: (env: Env) => void }} [breakIt] what breaks, decided by the solver
* @property {{ a: V3, b?: V3, center?: V3, reach?: number, offset?: number }} [cut] the section planes (normals pointing
*   at what is cut away, in the asset's frame) and where they sweep from
*/
/** @typedef {{ broken: boolean, time: number, slow: number, cut: number, xray: number }} Env how the asset is being shown, for its solver */
/**
* The kit an asset is built with.
* @param {THREE.Object3D} root
* @param {{ assemblies?: Assembly[], steps?: string[], sources?: { label: string, url: string }[] }} [o]
*/
function assetKit(root, { assemblies = [], steps = [], sources = [] } = {}) {
	/** @type {Part[]} */
	const parts = [];
	/** @type {Label[]} */
	const labels = [];
	/** @type {THREE.Mesh[]} */
	const shells = [];
	/** @type {((dt: number, env: Env) => void)[]} */
	const tickers = [];
	/** @type {Assembly[]} */
	const asms = [...assemblies];
	const ids = /* @__PURE__ */ new Set();
	/** @param {THREE.Object3D} obj @param {PartInfo} info @param {How} o @param {boolean} [unit] */
	const keep = (obj, info, o, unit = false) => {
		/** @type {Part} */
		const p = {
			obj,
			info,
			base: obj.position.clone(),
			off: o.explode ? new three.Vector3(...o.explode) : null,
			delay: o.delay ?? parts.length * .618 % 1 * .3,
			order: parts.length,
			...unit ? { unit } : {}
		};
		parts.push(p);
		if (unit) return p;
		obj.userData.part = info.id;
		if (o.xray === "shell") obj.traverse((m) => m.isMesh && shells.push(m));
		if (o.tag) labels.push({
			obj,
			at: new three.Vector3(...o.tag.at ?? [
				0,
				0,
				0
			]),
			text: o.tag.text ?? info.label,
			value: o.tag.value,
			side: o.tag.side
		});
		return p;
	};
	return {
		root,
		/**
		* A part: `obj` holding its meshes, placed where it sits, added to `parent` (the root, or a part it moves with),
		* its card and how it is shown.
		* @param {THREE.Object3D} obj
		* @param {Omit<PartInfo, 'step'> & { step?: number }} info
		* @param {How} [o]
		* @param {THREE.Object3D} [parent]
		*/
		part(obj, info, o = {}, parent = root) {
			if (ids.has(info.id)) throw new Error(`part ${info.id} twice`);
			if (!asms.some((a) => a.id === info.assembly)) throw new Error(`part ${info.id}: no assembly ${info.assembly}`);
			ids.add(info.id);
			if (obj.parent !== parent) parent.add(obj);
			obj.name ||= info.id;
			obj.traverse((m) => {
				if (m.isMesh) m.castShadow = m.receiveShadow = true;
			});
			keep(obj, {
				...info,
				step: info.step ?? asms.findIndex((a) => a.id === info.assembly) + 1
			}, o);
			return obj;
		},
		/**
		* A mesh for a part to hold, placed in the part's frame.
		* @param {THREE.BufferGeometry} geo @param {THREE.Material} material
		* @param {{ pos?: V3, rot?: V3, to?: THREE.Object3D }} [o]
		*/
		mesh(geo, material, { pos, rot, to } = {}) {
			const m = new three.Mesh(geo, material);
			if (pos) m.position.set(...pos);
			if (rot) m.rotation.set(...rot);
			m.castShadow = m.receiveShadow = true;
			to?.add(m);
			return m;
		},
		/** a label pinned on any object of the asset (not only a part) @param {THREE.Object3D} obj @param {string} text @param {{ at?: V3, value?: () => string, side?: 'left' | 'right' }} [o] */
		label(obj, text, o = {}) {
			labels.push({
				obj,
				at: new three.Vector3(...o.at ?? [
					0,
					0,
					0
				]),
				text,
				value: o.value,
				side: o.side
			});
		},
		/** run every frame the asset is shown or played: its solver and its moving parts @param {(dt: number, env: Env) => void} f */
		onTick(f) {
			tickers.push(f);
		},
		/** move a part's resting place (a part a solver slides), so the exploded view still starts from it @param {THREE.Object3D} obj @param {V3} at */
		place(obj, at) {
			const p = parts.find((q) => q.obj === obj);
			if (p) p.base.set(...at);
			else obj.position.set(...at);
		},
		/**
		* Carry another asset: it hangs from `parent` at `at`, turned by `rot`. A guest sealed by its own kit brings
		* its parts, labels, shells and solver, which become this asset's: its parts keep their cards under `prefix`;
		* they go into the host's assembly `assembly` (made from `asm` if the host has none of that id), else keep the
		* guest's own assemblies (prefixed). In the exploded view the whole guest first moves out by `explode`, then its
		* parts apart. Any other object (a thing, a rigged kind, a plant) is carried whole, as one part with its own
		* `card`. `ref` names the asset at its version (`machines/powercube@3`; an object made by `objectAt` knows its
		* own): every part that came with it says so on its card.
		* @param {THREE.Object3D} guest
		* @param {{ at?: V3, rot?: V3, parent?: THREE.Object3D, prefix?: string, assembly?: string, asm?: Assembly, step?: number, explode?: V3, unit?: string, ref?: string, card?: Partial<PartInfo> }} [o]
		*/
		carry(guest, { at = [
			0,
			0,
			0
		], rot, parent = root, prefix = `${guest.name || "guest"}-`, assembly, asm, step, explode, unit, ref = guest.userData.ref, card = {} } = {}) {
			const g = guest.userData.asset;
			guest.position.set(...at);
			if (rot) guest.rotation.set(...rot);
			parent.add(guest);
			const from = ref ? { ref } : {};
			if (!g) {
				const id = card.id ?? prefix.replace(/-$/, "");
				if (ids.has(id)) throw new Error(`part ${id} twice`);
				const a = assembly ?? id;
				if (!asms.some((x) => x.id === a)) asms.push({
					label: guest.name || id,
					note: "",
					out: explode ?? [
						0,
						.4,
						0
					],
					...asm,
					id: a
				});
				ids.add(id);
				guest.traverse((m) => {
					if (m.isMesh) m.castShadow = m.receiveShadow = true;
				});
				keep(guest, {
					label: guest.name || id,
					what: "",
					...card,
					...from,
					id,
					assembly: a,
					step: step ?? card.step ?? asms.findIndex((x) => x.id === a) + 1
				}, {
					explode,
					delay: 0
				});
				return guest;
			}
			if (assembly && asm && !asms.some((a) => a.id === assembly)) asms.push({
				...asm,
				id: assembly
			});
			if (!assembly) for (const a of g.catalog.assemblies) asms.push({
				...a,
				id: prefix + a.id,
				label: `${guest.name}: ${a.label}`
			});
			if (explode) keep(guest, {
				id: `${prefix}unit`,
				label: guest.name,
				assembly: assembly ?? "",
				what: "",
				step: step ?? 1,
				...from
			}, {
				explode,
				delay: 0
			}, true);
			for (const p of g.parts) {
				if (p.unit) continue;
				const id = prefix + p.info.id;
				ids.add(id);
				p.obj.userData.part = id;
				parts.push({
					...p,
					info: {
						...from,
						...p.info,
						id,
						assembly: assembly ?? prefix + p.info.assembly,
						step: step ?? p.info.step,
						...unit ? { unit } : {}
					},
					order: parts.length
				});
			}
			labels.push(...g.labels);
			shells.push(...g.shells);
			tickers.push((dt, env) => g.tick(dt, env));
			return guest;
		},
		/**
		* Finish the asset: its parts' ways out, its catalog, and the handles every viewer uses, written on the root.
		* @param {{ lab?: Lab, cut?: Lab['cut'], play?: string, seconds?: number }} [o]
		* @returns {SealedAsset}
		*/
		seal({ lab, cut, play = "Build it", seconds = 12 } = {}) {
			root.updateMatrixWorld(true);
			const sz = new three.Box3().setFromObject(root).getSize(new three.Vector3());
			const size = Math.max(sz.x, sz.y, sz.z);
			const toRoot = new three.Matrix4().copy(root.matrixWorld).invert();
			const centre = new Map(parts.map((p) => [p, new three.Box3().setFromObject(p.obj).getCenter(new three.Vector3()).applyMatrix4(toRoot)]));
			/** @type {Map<string, THREE.Vector3>} */
			const mid = /* @__PURE__ */ new Map();
			for (const a of asms) {
				const list = parts.filter((p) => !p.unit && p.info.assembly === a.id);
				if (list.length) mid.set(a.id, list.reduce((s, p) => s.add(centre.get(p)), new three.Vector3()).divideScalar(list.length));
			}
			const q = new three.Quaternion(), qr = new three.Quaternion();
			for (const p of parts) {
				if (p.off) continue;
				const a = asms.find((x) => x.id === p.info.assembly);
				const out = new three.Vector3(...a?.out ?? [
					0,
					0,
					0
				]);
				const m = mid.get(p.info.assembly);
				if (m) out.addScaledVector(
					/** @type {THREE.Vector3} */
					centre.get(p).clone().sub(m),
					.45
				);
				p.obj.parent?.getWorldQuaternion(q);
				root.getWorldQuaternion(qr);
				p.off = out.applyQuaternion(qr).applyQuaternion(q.invert());
			}
			const listed = parts.filter((p) => !p.unit);
			const catalog = {
				assemblies: asms.filter((a) => listed.some((p) => p.info.assembly === a.id)),
				parts: listed.map((p) => p.info),
				steps,
				sources,
				ranges: steps.map((_, i) => [i / Math.max(1, steps.length), (i + 1) / Math.max(1, steps.length)]),
				play,
				seconds
			};
			const n = Math.max(1, parts.length);
			const far = new three.Vector3(), up = new three.Vector3(0, size * .9, 0);
			/** where every part is: drawn out by `e` (0…1, staggered), and flown in from far by `u` of the build (1: all in) */
			const pose = (e, u = 1) => {
				for (const p of parts) {
					const ee = ease.io(clamp(e * 1.35 - p.delay * .35));
					const s = p.info.step ?? 1, of = Math.max(1, catalog.steps.length);
					const ai = u >= 1 ? 1 : ease.out(clamp(u * 1.6 - (s - 1) / of * .5 - p.order / n * .1));
					far.copy(p.off).normalize().multiplyScalar(size * 1.6).add(up);
					p.obj.position.copy(p.base).addScaledVector(p.off, ee).addScaledVector(far, 1 - ai);
					p.obj.visible = ai > .001;
				}
			};
			/** @type {SealedAsset} */
			const asset = {
				parts,
				labels,
				shells,
				catalog,
				size,
				lab,
				cut: cut ?? lab?.cut,
				pose,
				explode: (k) => pose(k, 1),
				build: (u) => pose(0, u),
				tick: (dt, env) => tickers.forEach((f) => f(dt, env)),
				partOf: (obj) => {
					for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData.part;
					return null;
				},
				objOf: (id) => parts.find((p) => p.info.id === id)?.obj ?? null
			};
			root.userData.asset = asset;
			root.userData.parts = Object.fromEntries(listed.map((p) => [p.info.id, p.obj]));
			root.userData.catalog = catalog;
			root.userData.explode = asset.explode;
			root.userData.setBuild = asset.build;
			return asset;
		}
	};
}
/**
* @typedef {object} SealedAsset what `seal` writes on an asset's root (`root.userData.asset`)
* @property {Part[]} parts
* @property {Label[]} labels
* @property {THREE.Mesh[]} shells
* @property {{ assemblies: Assembly[], parts: PartInfo[], steps: string[], sources: { label: string, url: string }[], ranges: [number, number][], play: string, seconds: number }} catalog
* @property {number} size its largest outer measure (m)
* @property {Lab | undefined} lab
* @property {Lab['cut']} cut
* @property {(explode: number, build?: number) => void} pose
* @property {(k: number) => void} explode
* @property {(u: number) => void} build
* @property {(dt: number, env: Env) => void} tick
* @property {(obj: THREE.Object3D) => string | null} partOf the part an object belongs to
* @property {(id: string) => THREE.Object3D | null} objOf
*/
/**
* An asset as the machines list it ($lib/machines): a cast with no bones, its moves
* played by its own solver.
* @param {THREE.Object3D} root a sealed asset
* @returns {import('$lib/actors/rig').Cast}
*/
const castOf = (root) => ({
	rig: {
		object: root,
		bones: {},
		names: [],
		pose: () => {}
	},
	clips: {},
	first: "",
	catalog: root.userData.asset.catalog,
	asset: root.userData.asset
});

//#endregion
//#region src/lib/machines/vehicle.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/** @typedef {ReturnType<typeof import('$lib/assets/parts.js').assetKit>} Kit */
/** gravity (m/s²) */
const G = 9.81;
/** air at 20 °C at sea level (kg/m³) */
const RHO_AIR = 1.2;
/** fuels: density (g/L) */
const FUELS = {
	diesel: {
		label: "diesel",
		rho: 835
	},
	petrol: {
		label: "petrol",
		rho: 745
	}
};
/** a rounded rectangle centred on (cx, cy) @param {number} w @param {number} h @param {number} r @param {number} [cx] @param {number} [cy] */
function rrect(w, h, r, cx = 0, cy = 0) {
	const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
	return roundPoly([
		[x0, y0],
		[x1, y0],
		[x1, y1],
		[x0, y1]
	], r);
}
/**
* Trace a polygon with its corners rounded into a shape or a path: each corner cut back by up to `r` along both its
* edges and joined by a curve.
* @param {V2[]} pts @param {number | number[]} r a radius, or one per corner @param {THREE.Path} path
*/
function tracePoly(pts, r, path) {
	const n = pts.length;
	for (let i = 0; i < n; i++) {
		const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
		const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
		const d = Math.min(Array.isArray(r) ? r[i] : r, la / 2, lb / 2);
		const p0 = [p[0] + (a[0] - p[0]) * d / la, p[1] + (a[1] - p[1]) * d / la];
		const p1 = [p[0] + (b[0] - p[0]) * d / lb, p[1] + (b[1] - p[1]) * d / lb];
		if (i === 0) path.moveTo(p0[0], p0[1]);
		else path.lineTo(p0[0], p0[1]);
		if (d > 1e-6) path.quadraticCurveTo(p[0], p[1], p1[0], p1[1]);
	}
	path.closePath();
	return path;
}
/** a polygon with its corners rounded, as a shape @param {V2[]} pts @param {number | number[]} r a radius, or one per corner */
function roundPoly(pts, r) {
	const s = new three.Shape();
	tracePoly(pts, r, s);
	return s;
}
/** the same polygon as a hole (a Path) @param {V2[]} pts @param {number | number[]} r */
function roundHole(pts, r) {
	const p = new three.Path();
	tracePoly(pts, r, p);
	return p;
}
/** a circle as a hole @param {number} x @param {number} y @param {number} r */
function circle(x, y, r) {
	const p = new three.Path();
	p.absarc(x, y, r, 0, Math.PI * 2, true);
	return p;
}
/** a thin plate from a shape along z, centred, sharp-edged and light (sheet metal, glass, trim) @param {THREE.Shape} s @param {number} d @param {number} [seg] */
const plate = (s, d, seg = 8) => new three.ExtrudeGeometry(s, {
	depth: d,
	bevelEnabled: false,
	curveSegments: seg
}).translate(0, 0, -d / 2);
/** a solid from a shape along z, centred, its edges softened by a small bevel, light (few segments on its curves) @param {THREE.Shape} s @param {number} d @param {number} [b] @param {number} [seg] */
function ext(s, d, b = .002, seg = 4) {
	const g = new three.ExtrudeGeometry(s, {
		depth: d,
		bevelEnabled: b > 0,
		bevelThickness: b,
		bevelSize: b,
		bevelSegments: 1,
		curveSegments: seg
	});
	g.translate(0, 0, -d / 2);
	g.computeVertexNormals();
	return g;
}
/** a plain box, centred (for sheets too thin to show a rounded edge) @param {number} w @param {number} h @param {number} d */
const slab = (w, h, d) => new three.BoxGeometry(w, h, d);
/** a rounded box, centred @param {number} w @param {number} h @param {number} d @param {number} [r] @param {number} [s] */
const box = (w, h, d, r = Math.min(w, h, d) * .12, s = 1) => GEO.rbox(w, h, d, Math.min(r, w / 2, h / 2, d / 2) * .999, s);
/** move a geometry @param {THREE.BufferGeometry} g @param {number} x @param {number} y @param {number} z */
const at = (g, x, y, z) => g.translate(x, y, z);
/** a solid of revolution about x from closed [r, x] points @param {V2[]} pts @param {number} [seg] */
const latheX = (pts, seg = 48) => GEO.lathe(pts, seg).rotateZ(-Math.PI / 2);
/** about z @param {V2[]} pts @param {number} [seg] */
const latheZ = (pts, seg = 48) => GEO.lathe(pts, seg).rotateX(Math.PI / 2);
/** a closed cylinder from a to b @param {V3} a @param {V3} b @param {number} r @param {number} [seg] */
function cyl(a, b, r, seg = 24) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b), len = A.distanceTo(B);
	const g = GEO.disc(r, len, Math.min(r, len) * .06, seg);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
	return g.translate(...A.clone().add(B).multiplyScalar(.5).toArray());
}
/** a plain, light cylinder from a to b (a bar, a tube, a strap) @param {V3} a @param {V3} b @param {number} r @param {number} [seg] */
function bar(a, b, r, seg = 12) {
	const A = new three.Vector3(...a), B = new three.Vector3(...b);
	const g = new three.CylinderGeometry(r, r, A.distanceTo(B), seg);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), B.clone().sub(A).normalize()));
	return g.translate(...A.clone().add(B).multiplyScalar(.5).toArray());
}
/** a coil spring along +y, light: `turns` turns of wire round radius R over `len` @param {number} R @param {number} wire @param {number} turns @param {number} len @param {number} [seg] @param {number} [radial] */
function coil(R, wire, turns, len, seg = 90, radial = 6) {
	const pts = [];
	for (let i = 0; i <= seg; i++) {
		const t = i / seg, a = t * turns * Math.PI * 2;
		pts.push(new three.Vector3(R * Math.cos(a), t * len, R * Math.sin(a)));
	}
	return new three.TubeGeometry(new three.CatmullRomCurve3(pts), seg, wire, radial, false);
}
/** the coil builder, under a name a spring's options do not hide */
const coilOf = (R, w, n, len, seg, rad) => coil(R, w, n, len, seg, rad);
/** a hose, a pipe or a rope through points @param {V3[]} pts @param {number} r @param {number} [radial] */
const hose = (pts, r, radial = 12) => GEO.pipe(pts, r, {
	seg: Math.max(16, pts.length * 10),
	radial,
	tension: .5
});
/** one hex head at a point, its axis along `dir` @param {V3} p @param {V3} dir @param {number} s @param {number} h */
function hex(p, dir, s, h) {
	const g = new three.CylinderGeometry(s, s, h, 6).translate(0, h / 2, 0);
	g.applyQuaternion(new three.Quaternion().setFromUnitVectors(new three.Vector3(0, 1, 0), new three.Vector3(...dir).normalize()));
	return g.translate(...p);
}
/** a shape drawn in a side's plane, as (z, y) points, for `onX` @param {V2[]} pts zy points @returns {V2[]} */
const zy = (pts) => pts.map(([z, y]) => [-z, y]);
/** a plate drawn in (z, y) (by `zy`) turned to stand in the plane x = x0, its thickness along x @param {THREE.BufferGeometry} g @param {number} x0 */
const onX = (g, x0) => g.rotateY(Math.PI / 2).translate(x0, 0, 0);
/** a shape drawn as (x, z) points, for `onY` @param {V2[]} pts @returns {V2[]} */
const xz = (pts) => pts.map(([x, z]) => [x, -z]);
/** a plate drawn in (x, z) (by `xz`) laid flat at height y0 @param {THREE.BufferGeometry} g @param {number} y0 */
const onY = (g, y0) => g.rotateX(-Math.PI / 2).translate(0, y0, 0);
/**
* A solid of revolution about x through a closed [r, x, tag] profile at the angles given (radians, one turn, rising),
* each vertex's radius changed by `bump(r, x, ring, tag)`: a tyre's lugs. Corners sharper than 30° along the profile
* stay crisp (GEO.lathe's way); rings close together make crisp walls round it.
* @param {[number, number, number?][]} pts @param {number[]} angles @param {(r: number, x: number, ring: number, tag: number) => number} bump
*/
function revolveX(pts, angles, bump) {
	let p = pts.map(([r, x, t]) => [
		Math.max(0, r),
		x,
		t ?? 0
	]);
	let area = 0;
	for (let i = 0; i < p.length; i++) {
		const a = p[i], b = p[(i + 1) % p.length];
		area += a[0] * b[1] - b[0] * a[1];
	}
	if (area < 0) p.reverse();
	const n0 = p.length, cosT = Math.cos(three.MathUtils.degToRad(30));
	const dir = (a, b) => {
		const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
		return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
	};
	const crease = (i) => {
		const u = dir(p[(i - 1 + n0) % n0], p[i]), v = dir(p[i], p[(i + 1) % n0]);
		return u[0] * v[0] + u[1] * v[1] < cosT;
	};
	let s0 = 0;
	for (let i = 0; i < n0; i++) if (crease(i)) {
		s0 = i;
		break;
	}
	const flags = p.map((_, i) => crease(i));
	p = [...p.slice(s0), ...p.slice(0, s0)];
	const cf = [...flags.slice(s0), ...flags.slice(0, s0)];
	const out = [p[0]];
	for (let i = 1; i < n0; i++) {
		out.push(p[i]);
		if (cf[i]) out.push(p[i]);
	}
	out.push(p[0]);
	const P = out.length, N = angles.length;
	const pos = new Float32Array(N * P * 3), uv = new Float32Array(N * P * 2);
	for (let i = 0; i < N; i++) {
		const c = Math.cos(angles[i]), s = Math.sin(angles[i]);
		for (let j = 0; j < P; j++) {
			const [r, x, t] = out[j], rr = bump(r, x, i, t), k = i * P + j;
			pos.set([
				x,
				rr * c,
				rr * s
			], k * 3);
			uv.set([i / N, j / (P - 1)], k * 2);
		}
	}
	const idx = [];
	for (let i = 0; i < N; i++) {
		const i2 = (i + 1) % N;
		for (let j = 0; j < P - 1; j++) {
			const a = i * P + j, b = i2 * P + j, c = i2 * P + j + 1, d = i * P + j + 1;
			idx.push(a, b, d, b, c, d);
		}
	}
	const g = new three.BufferGeometry();
	g.setAttribute("position", new three.BufferAttribute(pos, 3));
	g.setAttribute("uv", new three.BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}
/** the running gear's palette (AirSup's measured presets), for any vehicle to take or override */
function vehicleMaterials() {
	return {
		tyre: MAT.rubber({
			color: [
				.022,
				.022,
				.024
			],
			roughness: .86
		}),
		rimSteel: MAT.paint({
			color: [
				.42,
				.43,
				.44
			],
			roughness: .38,
			clearcoat: .2,
			metalness: .55
		}),
		rimAlloy: MAT.aluminium({
			color: [
				.8,
				.81,
				.82
			],
			roughness: .24,
			finish: "turned"
		}),
		rimDark: MAT.paint({
			color: [
				.06,
				.065,
				.07
			],
			roughness: .35,
			clearcoat: .5,
			metalness: .4
		}),
		chrome: MAT.chrome({ roughness: .1 }),
		disc: MAT.steel({
			color: [
				.46,
				.46,
				.46
			],
			roughness: .34,
			finish: "turned",
			cap: [
				.62,
				.61,
				.6
			]
		}),
		castIron: MAT.castIron(),
		calliper: MAT.paint({
			color: [
				.05,
				.05,
				.055
			],
			roughness: .5,
			clearcoat: .2
		}),
		zinc: MAT.steel({
			color: [
				.55,
				.56,
				.57
			],
			roughness: .32,
			finish: "cast"
		}),
		forged: MAT.steelDark({ roughness: .4 }),
		chassis: MAT.paint({
			color: [
				.03,
				.03,
				.032
			],
			roughness: .55,
			clearcoat: .1
		}),
		spring: MAT.paint({
			color: [
				.025,
				.025,
				.027
			],
			roughness: .4,
			clearcoat: .5,
			metalness: .3
		}),
		damper: MAT.paint({
			color: [
				.04,
				.04,
				.045
			],
			roughness: .35,
			clearcoat: .3
		}),
		rod: MAT.chrome({ roughness: .08 }),
		bush: MAT.rubber({ color: [
			.03,
			.03,
			.032
		] }),
		boot: MAT.rubber({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .6
		})
	};
}
/** @typedef {ReturnType<typeof vehicleMaterials>} VehicleMats */
/**
* A copy of `mat` that the section cuts with its first plane alone (the lengthwise one), not with the two together.
* The two planes take away the near corner above the cut's height, and a part that hangs just under that height across
* the vehicle's end (a bumper, its number plate) is left as a sliver a few cm thick, its cap floating in the air
* beside the cut-away body. Cut lengthwise instead, its near half goes and its far half shows a clean cap at the middle.
* It keeps the cap shading (shared with `mat`) and the live planes, not copies of them.
* @template {THREE.Material} M
* @param {M} mat
* @returns {M}
*/
function halfCut(mat) {
	const c = mat.clone();
	c.clippingPlanes = [LAB_PLANES[0]];
	c.clipIntersection = false;
	c.onBeforeCompile = mat.onBeforeCompile;
	c.customProgramCacheKey = mat.customProgramCacheKey;
	c.userData = { ...mat.userData };
	return c;
}
/**
* A tyre's measures from its marking: section width (mm), aspect ratio (%), rim diameter (inches).
* @param {number} width @param {number} aspect @param {number} rim
*/
function tyreSize(width, aspect, rim) {
	const w = width / 1e3, side = w * aspect / 100, rr = rim * .0254 / 2;
	return {
		w,
		side,
		rim: rr,
		r: rr + side,
		code: `${width}/${aspect} R${rim}`
	};
}
/** @typedef {ReturnType<typeof tyreSize>} TyreSize */
/**
* A tyre as one rubber solid round the axle: its beads on the rim's seats, its sidewalls bulging to the section width,
* rounded shoulders, a tread of ribs between circumferential grooves cut across by lugs, and the inner liner round the
* air, so a cut shows the carcass as a C round its air. `highway`: three narrow grooves, shallow lugs on the shoulders
* and staggered across the middle ribs (a light-truck tyre); `allTerrain`: three wide grooves, deep staggered blocks.
* @param {{ size: TyreSize, rimW: number, pattern?: 'highway' | 'allTerrain', pitches?: number }} o
*/
function tyreGeometry({ size, rimW, pattern = "highway", pitches = 18 }) {
	const { w, side: s, rim, r: R } = size;
	const hw = w / 2, hb = rimW / 2 + .006, tw = hw - .034;
	const hwy = pattern === "highway";
	const d = hwy ? .009 : .013, gw = hwy ? .009 : .012;
	const grooves = hwy ? [
		-.55,
		0,
		.55
	] : [
		-.5,
		0,
		.5
	];
	/** @type {[number, number, number?][]} */
	const pts = [
		[rim, -hb],
		[rim + .02, -hb - .007],
		[rim + .45 * s, -hw],
		[rim + .78 * s, -hw + .007],
		[
			R - .028,
			-hw + .02,
			1
		],
		[
			R - .008,
			-hw + .033,
			1
		],
		[
			R,
			-tw,
			1
		]
	];
	for (const g of grooves) {
		const c = g * tw;
		pts.push([
			R,
			c - gw / 2,
			1
		], [
			R - d,
			c - gw / 2 + .0015,
			2
		], [
			R - d,
			c + gw / 2 - .0015,
			2
		], [
			R,
			c + gw / 2,
			1
		]);
	}
	pts.push([
		R,
		tw,
		1
	], [
		R - .008,
		hw - .033,
		1
	], [
		R - .028,
		hw - .02,
		1
	], [rim + .78 * s, hw - .007], [rim + .45 * s, hw], [rim + .02, hb + .007], [rim, hb]);
	pts.push([rim, hb - .024], [rim + .5 * s, hw - .013], [R - .03, hw - .045], [R - .03, -hw + .045], [rim + .5 * s, -hw + .013], [rim, -hb + .024]);
	const P = Math.PI * 2 / pitches, gf = hwy ? .24 : .34, eps = P * .05;
	/** @type {number[]} */
	const angles = [];
	/** @type {number[]} */
	const inLug = [];
	for (let k = 0; k < pitches; k++) {
		const a = k * P;
		angles.push(a, a + eps, a + gf * P - eps, a + gf * P);
		inLug.push(0, 1, 1, 0);
	}
	const ribOf = (x) => grooves.filter((g) => x > g * tw).length;
	return revolveX(pts, angles, (r, x, i, tag) => {
		if (tag !== 1 || !inLug[i]) return r;
		const f = clamp((r - (R - .03)) / .03);
		const rib = ribOf(x), k = Math.floor(i / 4);
		return rib === 0 || rib === grooves.length || (k + rib) % 2 === 0 ? r - d * f : r;
	});
}
/**
* A rim's barrel: the two flanges and bead seats, the safety humps and the drop-centre well the beads go into to fit
* the tyre, as one pressed (or cast) wall of thickness t round the axle.
* @param {{ rim: number, rimW: number, t?: number, seg?: number }} o
*/
function barrelGeometry({ rim, rimW, t = .0035, seg = 30 }) {
	const a = rimW / 2, R0 = rim, hf = .0175;
	/** @type {V2[]} */
	const prof = [
		[R0 + hf + .002, -a - .008],
		[R0 + hf, -a - .003],
		[R0 + .004, -a],
		[R0, -a + .008],
		[R0, -a + .035],
		[R0 - .004, -a + .05],
		[R0 - .028, -a + .07],
		[R0 - .028, a - .042],
		[R0 - .004, a - .028],
		[R0, a - .022],
		[R0, a - .008],
		[R0 + .004, a],
		[R0 + hf, a + .003],
		[R0 + hf + .002, a + .008]
	];
	return GEO.shell(prof, t, seg).rotateZ(-Math.PI / 2);
}
/** the stud holes round a disc and its centre bore, as holes in a shape @param {THREE.Shape} s @param {number} n @param {number} pcd @param {number} hole @param {number} bore @param {number} [phase] */
function studHoles(s, n, pcd, hole, bore, phase = 0) {
	s.holes.push(circle(0, 0, bore));
	for (let k = 0; k < n; k++) {
		const a = phase + k / n * Math.PI * 2;
		s.holes.push(circle(-(pcd / 2) * Math.cos(a), pcd / 2 * Math.sin(a), hole));
	}
	return s;
}
/**
* A pressed-steel wheel: the barrel, a flat mounting face on the hub with its stud holes, a dished centre with its
* cooling vents pressed through, welded into the well. Its mounting face at x = et (outward of the rim's middle).
* @param {{ rim: number, rimW: number, et: number, studs: number, pcd: number, vents?: number }} o
*/
function steelRimGeometry({ rim, rimW, et, studs, pcd, vents = 8 }) {
	const R0 = rim, t = .004;
	const face = studHoles(new three.Shape().absarc(0, 0, .098, 0, Math.PI * 2, false), studs, pcd, .0075, .036);
	const ring = new three.Shape().absarc(0, 0, .16, 0, Math.PI * 2, false);
	ring.holes.push(circle(0, 0, .118));
	for (let k = 0; k < vents; k++) {
		const a = (k + .5) / vents * Math.PI * 2;
		ring.holes.push(circle(.139 * Math.cos(a), .139 * Math.sin(a), .0135));
	}
	const xr = et + .018, xw = rimW / 2 - .045;
	return GEO.merge([
		barrelGeometry({
			rim,
			rimW
		}),
		onX(plate(face, t, 8), et + t / 2),
		GEO.shell([
			[.098, et + t],
			[.11, et + .008],
			[.118, xr]
		], t, 32).rotateZ(-Math.PI / 2),
		onX(plate(ring, t, 8), xr - t / 2),
		GEO.shell([
			[.16, xr],
			[.18, xr - .004],
			[R0 - .03, Math.min(xw, xr - .008)]
		], t, 36).rotateZ(-Math.PI / 2)
	]);
}
/**
* A cast-alloy wheel: a thick barrel, and a face of `spokes` spokes from a hub boss to the rim, its stud holes in the
* boss, its windows showing the brake behind.
* @param {{ rim: number, rimW: number, et: number, studs: number, pcd: number, spokes?: number }} o
*/
function alloyRimGeometry({ rim, rimW, et, studs, pcd, spokes = 6 }) {
	const Rf = rim - .004;
	const face = new three.Shape().absarc(0, 0, Rf, 0, Math.PI * 2, false);
	studHoles(face, studs, pcd, .0085, .034, Math.PI / studs);
	const spokeW = .052, rIn = .098, rOut = Rf - .022;
	for (let k = 0; k < spokes; k++) {
		const a0 = k / spokes * Math.PI * 2, a1 = (k + 1) / spokes * Math.PI * 2;
		/** @type {V2[]} */
		const win = [];
		const dIn = Math.asin(spokeW / 2 / rIn), dOut = Math.asin(spokeW * 1.25 / 2 / rOut);
		for (let j = 0; j <= 6; j++) {
			const a = a0 + dOut + (a1 - a0 - 2 * dOut) * j / 6;
			win.push([rOut * Math.cos(a), rOut * Math.sin(a)]);
		}
		for (let j = 2; j >= 0; j--) {
			const a = a0 + dIn + (a1 - a0 - 2 * dIn) * j / 2;
			win.push([rIn * Math.cos(a), rIn * Math.sin(a)]);
		}
		face.holes.push(roundHole(win, .012));
	}
	const depth = .026;
	const faceGeo = ext(face, depth, .003, 8).rotateY(Math.PI / 2).translate(et + .012 + depth / 2, 0, 0);
	return GEO.merge([
		barrelGeometry({
			rim,
			rimW,
			t: .0055
		}),
		faceGeo,
		latheX([
			[.036, et],
			[.09, et],
			[.09, et + .012],
			[.036, et + .012]
		], 40),
		GEO.shell([[Rf - .004, et + .014], [rim - .026, rimW / 2 - .044]], .006, 64).rotateZ(-Math.PI / 2)
	]);
}
/**
* A vented brake disc: two friction rings with radial vanes between (the air pumped out through them), on its hat.
* The hat's face (on the hub) at x = 0, the rings' middle at x = −hat.
* @param {{ r: number, rIn: number, t: number, hat: number, vanes?: number }} o
*/
function discGeometry({ r, rIn, t, hat, vanes = 28 }) {
	const f = t * .32, xm = -hat;
	/** @type {THREE.BufferGeometry[]} */
	const rings = [latheX([
		[rIn, xm + t / 2 - f],
		[r, xm + t / 2 - f],
		[r, xm + t / 2],
		[rIn, xm + t / 2]
	], 48), latheX([
		[rIn, xm - t / 2],
		[r, xm - t / 2],
		[r, xm - t / 2 + f],
		[rIn, xm - t / 2 + f]
	], 48)];
	const vane = slab(t - 2 * f + 4e-4, r - rIn - .006, .005);
	for (let k = 0; k < vanes; k++) rings.push(vane.clone().translate(xm, (r + rIn) / 2, 0).rotateX(k / vanes * Math.PI * 2));
	const hatG = latheX([
		[.036, 0],
		[rIn + .006, 0],
		[rIn + .006, xm + t / 2 - .002],
		[rIn - .002, xm + t / 2 - .002],
		[rIn - .002, -.005],
		[.036, -.005]
	], 40);
	return {
		rings: GEO.merge(rings),
		hat: hatG
	};
}
/**
* A floating calliper over a disc's back edge: the piston housing inside, the fingers outside, the bridge over the
* disc, its bracket and its bleed nipple. Centred on the disc's middle plane (x = 0), at `angle` round the axle (from +z,
* towards +y).
* @param {{ r: number, t: number, angle: number, span?: number }} o
*/
function calliperGeometry({ r, t, angle, span = .42 }) {
	/** an annular sector in the (z, y) plane as a shape for `onX` @param {number} r0 @param {number} r1 @param {number} a0 @param {number} a1 */
	const sector = (r0, r1, a0, a1) => {
		/** @type {V2[]} */
		const pts = [];
		for (let j = 0; j <= 8; j++) {
			const a = a0 + (a1 - a0) * j / 8;
			pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]);
		}
		for (let j = 8; j >= 0; j--) {
			const a = a0 + (a1 - a0) * j / 8;
			pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]);
		}
		return roundPoly(zy(pts), .008);
	};
	const a0 = angle - span / 2, a1 = angle + span / 2;
	const inner = onX(ext(sector(r - .052, r + .024, a0, a1), .034, .003), -t / 2 - .02);
	const outer = onX(ext(sector(r - .036, r + .024, a0 + .05, a1 - .05), .013, .002), t / 2 + .009);
	const bridge = onX(ext(sector(r + .006, r + .026, a0 + .03, a1 - .03), t + .03, .002), 0);
	const am = angle, rb = r + .02;
	const nipple = cyl([
		-t / 2 - .03,
		rb * Math.sin(am + .12),
		rb * Math.cos(am + .12)
	], [
		-t / 2 - .03,
		(rb + .02) * Math.sin(am + .12),
		(rb + .02) * Math.cos(am + .12)
	], .004, 8);
	return GEO.merge([
		inner,
		outer,
		bridge,
		nipple
	]);
}
/**
* A brake drum and its backing plate: the drum's face on the hub at x = 0, its finned cylinder reaching in by `depth`,
* the plate closing it with the wheel cylinder's bump and the adjuster's bung.
* @param {{ r: number, depth: number }} o
*/
function drumGeometry({ r, depth }) {
	return {
		drum: latheX([
			[.036, 0],
			[r + .004, 0],
			[r + .008, -.01],
			[r + .008, -.016],
			[r + .004, -.02],
			[r + .004, -.03],
			[r + .009, -.034],
			[r + .009, -.04],
			[r + .004, -.044],
			[r + .004, -depth],
			[r - .009, -depth],
			[r - .009, -.007],
			[.036, -.007]
		], 40),
		back: GEO.merge([
			latheX([
				[.03, -depth - .002],
				[r + .012, -depth - .002],
				[r + .012, -depth - .006],
				[r - .01, -depth - .018],
				[.03, -depth - .018]
			], 40),
			cyl([
				-depth - .012,
				r * .72,
				0
			], [
				-depth - .03,
				r * .72,
				0
			], .014, 12),
			cyl([
				-depth - .01,
				-r * .6,
				.02
			], [
				-depth - .022,
				-r * .6,
				.02
			], .009, 10)
		])
	};
}
/**
* A steering knuckle (upright) for double wishbones: the spindle into the hub, the body between the two ball joints,
* the steering arm reaching to the tie rod's end (back, or forward with `arm` 1). Its points in the wheel's frame.
* @param {{ et: number, arm?: 1 | -1 }} o
*/
function knuckleGeometry({ et, arm = -1 }) {
	const J = {
		...KNUCKLE,
		tie: [
			KNUCKLE.tie[0],
			KNUCKLE.tie[1],
			-arm * KNUCKLE.tie[2]
		]
	};
	const body = [
		cyl([
			et - .06,
			0,
			0
		], [
			J.body,
			0,
			0
		], .03, 14),
		cyl([
			J.body - .012,
			-.02,
			0
		], [
			J.body + .012,
			-.02,
			0
		], .05, 14),
		cyl([
			J.body,
			.02,
			0
		], [
			J.upper[0],
			J.upper[1] - .02,
			0
		], .017, 12),
		cyl([
			J.body,
			-.03,
			0
		], [
			J.lower[0],
			J.lower[1] + .02,
			0
		], .02, 12),
		cyl([
			J.body,
			-.02,
			0
		], [
			J.tie[0],
			J.tie[1],
			J.tie[2]
		], .012, 10)
	];
	const balls = [
		new three.SphereGeometry(.022, 14, 10).translate(...J.upper),
		new three.SphereGeometry(.026, 14, 10).translate(...J.lower),
		new three.SphereGeometry(.015, 12, 8).translate(...J.tie)
	];
	return {
		body: GEO.merge(body),
		balls: GEO.merge(balls)
	};
}
/** where a steered wheel's joints are, in its frame (+x out): the upper and lower ball joints, the tie rod's end, the knuckle's body */
const KNUCKLE = {
	upper: [
		-.112,
		.165,
		0
	],
	lower: [
		-.128,
		-.15,
		0
	],
	tie: [
		-.12,
		-.04,
		-.15
	],
	body: -.085
};
/**
* @typedef {object} CornerOptions
* @property {string} id short: fl, fr, rl, rr
* @property {string} label "front left"
* @property {V3} at the wheel's middle (in `parent`'s frame)
* @property {1 | -1} side which way its outer face looks (x)
* @property {TyreSize} size
* @property {number} rimW the rim's width between its flanges (m)
* @property {number} [et] how far out of the rim's middle its face on the hub is (m)
* @property {'steel' | 'alloy'} rim
* @property {number} studs @property {number} pcd the studs, on their circle's diameter (m)
* @property {'disc' | 'drum'} brake
* @property {{ r: number, rIn: number, t: number }} [disc]
* @property {{ r: number, depth: number }} [drum]
* @property {boolean} [steers] a knuckle and a steering axis
* @property {1 | -1} [arm] its steering arm reaches forward (1, the tie rods in front of the axle) or back (−1)
* @property {'highway' | 'allTerrain'} [pattern]
* @property {string} assembly @property {string} [source] @property {string} [drive]
* @property {[string, string][]} [specs] more of the wheel's numbers
* @property {import('$lib/assets/parts.js').How['tag']} [tag] a label on the tyre
* @property {VehicleMats} M
* @property {THREE.Material} [rimMat] @property {THREE.Material} [capMat]
* @property {THREE.Object3D} [parent]
*/
/**
* One wheel at its corner, in its parts: the tyre on its rim with its nuts and hub cap (`wheel-<id>`), the brake disc
* or drum and its hub (`brake-<id>`), the calliper or the backing plate (`calliper-<id>`), and on a steered wheel the
* knuckle (`knuckle-<id>`). A corner group at the wheel's middle (mirrored for a wheel whose outer face looks to −x),
* a steer group in it turning about the kingpin, and the wheel and brake spinning about the axle.
* @param {Kit} kit @param {CornerOptions} o
*/
function wheelCorner(kit, o) {
	const { M, size } = o, et = o.et ?? .03;
	const corner = new three.Group();
	corner.name = `corner-${o.id}`;
	corner.position.set(...o.at);
	corner.scale.x = o.side;
	(o.parent ?? kit.root).add(corner);
	const steer = new three.Group();
	steer.name = `steer-${o.id}`;
	corner.add(steer);
	const m = (g, mat) => kit.mesh(g, mat);
	const pcdR = o.pcd / 2;
	const wheel = new three.Group();
	const tyre = m(tyreGeometry({
		size,
		rimW: o.rimW,
		pattern: o.pattern ?? "highway"
	}), M.tyre);
	const rimGeo = o.rim === "alloy" ? alloyRimGeometry({
		rim: size.rim,
		rimW: o.rimW,
		et,
		studs: o.studs,
		pcd: o.pcd
	}) : steelRimGeometry({
		rim: size.rim,
		rimW: o.rimW,
		et,
		studs: o.studs,
		pcd: o.pcd
	});
	const faceX = o.rim === "alloy" ? et + .026 : et + .004;
	const phase = o.rim === "alloy" ? Math.PI / o.studs : 0;
	/** where stud k is round the axle (y, z) */
	const stud = (k) => {
		const a = phase + k / o.studs * Math.PI * 2;
		return [pcdR * Math.sin(a), pcdR * Math.cos(a)];
	};
	const ks = Array.from({ length: o.studs }, (_, k) => k);
	const nuts = GEO.merge(ks.map((k) => hex([
		faceX,
		stud(k)[0],
		stud(k)[1]
	], [
		1,
		0,
		0
	], .0115, .02)));
	const studs = GEO.merge(ks.map((k) => cyl([
		et - .02,
		stud(k)[0],
		stud(k)[1]
	], [
		faceX + .026,
		stud(k)[0],
		stud(k)[1]
	], .0065, 8)));
	const cap = o.rim === "alloy" ? latheX([
		[0, faceX - .004],
		[.032, faceX - .004],
		[.031, faceX + .004],
		[.022, faceX + .009],
		[0, faceX + .01]
	], 32) : latheX([
		[0, et + .004],
		[.052, et + .004],
		[.05, et + .016],
		[.038, et + .03],
		[.018, et + .037],
		[0, et + .039]
	], 40);
	wheel.add(tyre, m(rimGeo, o.rimMat ?? (o.rim === "alloy" ? M.rimAlloy : M.rimSteel)), m(nuts, M.chrome), m(studs, M.zinc), m(cap, o.capMat ?? M.chrome));
	const rimIn = Math.round(size.rim * 2 / .0254);
	kit.part(wheel, {
		id: `wheel-${o.id}`,
		label: `Wheel and tyre, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: `A ${size.code} tyre on a ${o.rim === "alloy" ? "cast-alloy" : "pressed-steel"} ${rimIn}" rim, held on the hub by ${o.studs} nuts: its beads sit on the rim's seats, its air carries the load, its tread grips the road.`,
		moves: o.steers ? "Rolls with the road and steers with the knuckle (shown turning 10 times slower)." : "Rolls with the road (shown turning 10 times slower).",
		drive: o.drive ?? "The road; its brake stops it",
		specs: [
			["Tyre", size.code],
			["Outer diameter", `${Math.round(size.r * 2e3)} mm`],
			["Rim", `${rimIn}" × ${(o.rimW / .0254).toFixed(1)}", ${o.studs} studs on ${Math.round(o.pcd * 1e3 * 10) / 10} mm`],
			...o.specs ?? []
		]
	}, {
		explode: [
			.42,
			0,
			0
		],
		tag: o.tag
	}, steer);
	const brake = new three.Group();
	const hubFlange = latheX([
		[.03, et - .006],
		[.082, et - .006],
		[.082, et - .018],
		[.05, et - .022],
		[.05, et - .06],
		[.03, et - .06]
	], 40);
	brake.add(m(hubFlange, M.forged));
	/** @type {THREE.BufferGeometry | null} */
	let back = null;
	if (o.brake === "disc" && o.disc) {
		const d = discGeometry({
			r: o.disc.r,
			rIn: o.disc.rIn,
			t: o.disc.t,
			hat: .042
		});
		brake.add(m(d.rings.translate(et - .006, 0, 0), M.disc), m(d.hat.translate(et - .006, 0, 0), M.castIron));
	} else if (o.drum) {
		const d = drumGeometry(o.drum);
		brake.add(m(d.drum.translate(et - .006, 0, 0), M.castIron));
		back = d.back.translate(et - .006, 0, 0);
	}
	kit.part(brake, o.brake === "disc" && o.disc ? {
		id: `brake-${o.id}`,
		label: `Brake disc, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A vented cast-iron disc bolted to the hub between it and the wheel: the calliper squeezes it, and its vanes pump air through it to carry the heat away.",
		moves: "Turns with the wheel.",
		drive: "The wheel; the calliper stops it",
		specs: [["Diameter", `${Math.round(o.disc.r * 2e3)} mm`], ["Thickness", `${Math.round(o.disc.t * 1e3)} mm, vented`]]
	} : {
		id: `brake-${o.id}`,
		label: `Brake drum, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A finned cast-iron drum on the hub: two shoes inside it, pushed out by the wheel cylinder, rub on its inner face. Cheap, sealed from the dust and good for a handbrake.",
		moves: "Turns with the wheel.",
		drive: "The wheel; its shoes stop it",
		specs: [["Diameter", `${Math.round((o.drum?.r ?? 0) * 2e3)} mm`], ["Width", `${Math.round((o.drum?.depth ?? 0) * 1e3 - 15)} mm shoes`]]
	}, { explode: [
		.22,
		0,
		0
	] }, steer);
	const still = new three.Group();
	if (o.brake === "disc" && o.disc) {
		const cal = calliperGeometry({
			r: o.disc.r,
			t: o.disc.t,
			angle: Math.PI * .9
		}).translate(et - .048, 0, 0);
		still.add(m(cal, M.calliper));
		still.add(m(hose([
			[
				et - .08,
				.06,
				-.12
			],
			[
				et - .13,
				.12,
				-.08
			],
			[
				et - .16,
				.2,
				-.04
			]
		], .0045, 8), M.boot));
	} else if (back) still.add(m(back, M.castIron), m(hose([
		[
			et - .1,
			o.drum ? o.drum.r * .72 : .1,
			0
		],
		[
			et - .16,
			.12,
			.03
		],
		[
			et - .2,
			.13,
			.06
		]
	], .003, 6), M.zinc));
	kit.part(still, o.brake === "disc" ? {
		id: `calliper-${o.id}`,
		label: `Brake calliper, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A floating calliper over the disc’s back edge: the brake fluid pushes its piston, which presses the inner pad on the disc and pulls the outer pad on from the other side.",
		specs: [["Pistons", "2 × Ø 51 mm [inferred]"], ["Pads", "Semi-metallic"]]
	} : {
		id: `calliper-${o.id}`,
		label: `Backing plate, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "The pressed-steel plate that closes the drum: it carries the two shoes, their springs, the wheel cylinder and the handbrake’s lever, bolted to the axle’s end.",
		specs: [["Wheel cylinder", "Ø 22 mm [inferred]"], ["Handbrake", "Cable, on these shoes"]]
	}, { explode: [
		.14,
		.12,
		0
	] }, steer);
	if (o.steers) {
		const k = knuckleGeometry({
			et,
			arm: o.arm ?? -1
		});
		kit.part(new three.Group().add(m(k.body, M.castIron), m(k.balls, M.forged)), {
			id: `knuckle-${o.id}`,
			label: `Steering knuckle, ${o.label}`,
			assembly: o.assembly,
			source: o.source,
			what: "The cast upright between the two wishbones’ ball joints: it carries the hub’s bearings on its spindle, the calliper on its bracket, and turns about the line through its ball joints (the kingpin axis) when the tie rod pulls its steering arm.",
			moves: "Steers about its ball joints; rides up and down with the wheel.",
			drive: "The tie rod, from the steering",
			specs: [["Material", "Nodular cast iron [inferred]"], ["Steering lock", "±38° [inferred]"]]
		}, { explode: [
			.08,
			0,
			0
		] }, steer);
	}
	/** the joints of its knuckle, in the frame `corner` hangs in */
	const joint = (p) => [
		o.at[0] + o.side * p[0],
		o.at[1] + p[1],
		o.at[2] + p[2]
	];
	return {
		corner,
		steer,
		wheel,
		brake,
		joints: {
			upper: joint(KNUCKLE.upper),
			lower: joint(KNUCKLE.lower),
			tie: joint([
				KNUCKLE.tie[0],
				KNUCKLE.tie[1],
				-(o.arm ?? -1) * KNUCKLE.tie[2]
			])
		},
		/** roll it to `turn` (rad, forward positive) and steer it `steerAngle` (rad, to the left positive) @param {number} turn @param {number} [steerAngle] */
		set(turn, steerAngle = 0) {
			wheel.rotation.x = brake.rotation.x = turn;
			steer.rotation.y = steerAngle * o.side;
		}
	};
}
/**
* A hinge: a pivot group on the hinge line at `at` in `parent`; what is built in it (in its frame, the hinge line
* through its origin along `axis`) turns by `max` × k as `set(k)` opens it, 0 shut … 1 open. Hand the pivot to
* `kit.part` as the door's own part: the exploded view moves it, the hinge turns it.
* @param {THREE.Object3D} parent @param {{ at: V3, axis?: 'x' | 'y' | 'z', max: number, name?: string }} o
*/
function hinge(parent, { at, axis = "y", max, name = "hinge" }) {
	const pivot = new three.Group();
	pivot.name = name;
	pivot.position.set(...at);
	parent.add(pivot);
	const h = {
		pivot,
		k: 0,
		max,
		/** @param {number} k */
		set(k) {
			h.k = clamp(k);
			pivot.rotation[axis] = max * h.k;
		}
	};
	return h;
}
/**
* A slide: a carriage running along a track of points (offsets from where it rests, in its parent's frame) as
* `set(k)` takes it from shut (0) to open (1), at an even speed along the track: a sliding door's arms and rails.
* @param {THREE.Object3D} parent @param {{ path: V3[], name?: string }} o
*/
function slide(parent, { path, name = "slide" }) {
	const carriage = new three.Group();
	carriage.name = name;
	parent.add(carriage);
	const pts = path.map((p) => new three.Vector3(...p));
	const lens = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
	const total = lens.reduce((a, b) => a + b, 0);
	const s = {
		carriage,
		k: 0,
		/** @param {number} k */
		set(k) {
			s.k = clamp(k);
			let d = s.k * total, i = 0;
			while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
			carriage.position.copy(pts[i]).lerp(pts[i + 1], lens[i] > 0 ? Math.min(1, d / lens[i]) : 0);
		}
	};
	return s;
}
/**
* A telescopic damper, with a coil spring round it if `coil` is given: its body's eye at `a`, its rod's eye at `b`;
* `set(a, b)` re-aims it and slides the rod in or out (both points in its parent's frame). Built along +y.
* @param {{ body: number, rod: number, rBody: number, rRod?: number, coil?: { R: number, wire: number, turns: number, seat: number }, M: VehicleMats, mesh: Kit['mesh'] }} o
*/
function telescope({ body, rod, rBody, rRod = .009, coil, M, mesh }) {
	const coilGeo = coilOf;
	const group = new three.Group();
	const eye = (y) => new three.TorusGeometry(.016, .006, 8, 16).rotateY(Math.PI / 2).translate(0, y, 0);
	const bodyG = GEO.merge([GEO.lathe([
		[0, .014],
		[rBody, .014],
		[rBody, body],
		[rBody * .6, body + .008],
		[0, body + .008]
	], 24), eye(0)]);
	group.add(mesh(bodyG, M.damper));
	const top = new three.Group();
	top.add(mesh(GEO.merge([GEO.lathe([
		[0, -rod],
		[rRod, -rod],
		[rRod, -.012],
		[0, -.012]
	], 16), eye(0)]), M.rod));
	/** @type {THREE.Mesh | null} */
	let spring = null;
	if (coil) {
		top.add(mesh(GEO.lathe([
			[rRod, -.026],
			[coil.R + .012, -.026],
			[coil.R + .012, -.018],
			[rRod, -.018]
		], 32), M.zinc));
		group.add(mesh(GEO.lathe([
			[rBody, coil.seat - .004],
			[coil.R + .012, coil.seat - .004],
			[coil.R + .012, coil.seat + .004],
			[rBody, coil.seat + .004]
		], 32), M.zinc));
		spring = mesh(coilGeo(coil.R, coil.wire, coil.turns, 1, 110, 6), M.spring);
		spring.position.y = coil.seat + .004;
		group.add(spring);
	}
	group.add(top);
	const A = new three.Vector3(), B = new three.Vector3(), up = new three.Vector3(0, 1, 0);
	return {
		group,
		/** @param {V3} a @param {V3} b */
		set(a, b) {
			A.set(...a);
			B.set(...b);
			group.position.copy(A);
			const L = A.distanceTo(B);
			group.quaternion.setFromUnitVectors(up, B.clone().sub(A).normalize());
			top.position.y = L;
			if (spring && coil) spring.scale.y = Math.max(.05, L - .026 - (coil.seat + .004));
			return L;
		}
	};
}
/**
* A leaf spring: `n` steel leaves stacked under the main leaf (the longest, an eye rolled at each end), curved up at
* its ends by `camber` over its middle; `set(camber)` bends it (it flattens as its load grows). Along z, its middle on
* the origin at the main leaf's middle.
* @param {{ L: number, w: number, t: number, n: number, camber: number }} o
*/
function leafPack({ L, w, t, n, camber }) {
	const segs = 14, ring = 8;
	const leaves = Array.from({ length: n }, (_, i) => ({
		len: L * (1 - i * (.62 / Math.max(1, n - 1))),
		y: -i * t
	}));
	const nv = leaves.length * 128;
	const pos = new Float32Array(nv * 3);
	/** @type {number[]} */
	const idx = [];
	let v = 0;
	const base = leaves.map(() => {
		const b = v;
		v += 128;
		return b;
	});
	leaves.forEach((_, li) => {
		const b = base[li];
		for (let s = 0; s < segs; s++) for (let f = 0; f < 4; f++) {
			const a0 = b + s * ring + f * 2, a1 = a0 + 1, c0 = a0 + ring, c1 = a1 + ring;
			idx.push(a0, c0, a1, a1, c0, c1);
		}
		const e0 = b + 120, e1 = e0 + 4;
		idx.push(e0, e0 + 1, e0 + 2, e0, e0 + 2, e0 + 3, e1, e1 + 2, e1 + 1, e1, e1 + 3, e1 + 2);
	});
	const geo = new three.BufferGeometry();
	geo.setAttribute("position", new three.BufferAttribute(pos, 3));
	geo.setIndex(idx);
	const eyes = [new three.Group(), new three.Group()];
	const set = (c) => {
		const yAt = (z) => c * (2 * z / L) ** 2;
		leaves.forEach((lf, li) => {
			const b = base[li];
			/** the four faces' corners, each face its own pair so its edges stay crisp */
			const corners = (z) => {
				const y = yAt(z) + lf.y, x = w / 2, h = t / 2 - 4e-4;
				return [
					[-x, y + h],
					[x, y + h],
					[x, y + h],
					[x, y - h],
					[x, y - h],
					[-x, y - h],
					[-x, y - h],
					[-x, y + h]
				];
			};
			for (let s = 0; s <= segs; s++) {
				const z = -lf.len / 2 + lf.len * s / segs;
				corners(z).forEach(([x, y], k) => pos.set([
					x,
					y,
					z
				], (b + s * ring + k) * 3));
			}
			for (const [e, z] of [[0, -lf.len / 2], [4, lf.len / 2]]) {
				const y = yAt(z) + lf.y, h = t / 2 - 4e-4;
				[
					[-w / 2, y + h],
					[w / 2, y + h],
					[w / 2, y - h],
					[-w / 2, y - h]
				].forEach(([x, yy], k) => pos.set([
					x,
					yy,
					z
				], (b + 120 + e + k) * 3));
			}
		});
		geo.attributes.position.needsUpdate = true;
		geo.computeVertexNormals();
		geo.computeBoundingBox();
		geo.computeBoundingSphere();
		eyes[0].position.set(0, yAt(-L / 2) + .012, -L / 2);
		eyes[1].position.set(0, yAt(L / 2) + .012, L / 2);
	};
	set(camber);
	return {
		geo,
		eyes,
		eye: new three.TorusGeometry(.016, t * .75, 8, 18).rotateY(Math.PI / 2),
		set
	};
}
/**
* The road's load on a vehicle (N) and the power at its wheels to hold the speed (W): rolling, climbing and the air.
* @param {{ m: number, Crr: number, CdA: number, rho?: number }} car mass (kg), rolling coefficient, drag area (m²)
* @param {number} v speed (m/s) @param {number} grade rise over run (0.1 = 10 %)
*/
function roadLoad({ m, Crr, CdA, rho = RHO_AIR }, v, grade) {
	const th = Math.atan(grade);
	const roll = m * G * Crr * Math.cos(th) * Math.min(1, v / .3);
	const climb = m * G * Math.sin(th);
	const air = .5 * rho * CdA * v * v;
	const F = roll + climb + air;
	return {
		roll,
		climb,
		air,
		F,
		P: F * v,
		th
	};
}
/**
* @typedef {object} Engine an engine as the solver runs it
* @property {number[]} rpm @property {number[]} nm its full-load (brake) torque curve
* @property {number} idle @property {number} stall @property {number} max rpm: at idle, where it stalls under load, its limit
* @property {number} up @property {number} down the driver changes up past `up`, never runs it under `down`
* @property {number} launch the speed the driver holds it at with the clutch slipping, pulling away
* @property {number} Vd displacement (m³) @property {number} fmep its friction mean effective pressure at 2,000 rpm (Pa)
* @property {number} bsfc indicated specific fuel consumption (g/kWh) @property {keyof typeof FUELS} fuel
* @property {number} J the engine's, flywheel's and clutch's inertia (kg·m²)
*/
/**
* @typedef {object} Vehicle a wheeled machine as the solver runs it
* @property {number} kerb kg, ready to drive with its driver @property {number} payload kg it may carry
* @property {number} Crr @property {number} CdA m² @property {number} r the tyres' rolling radius (m)
* @property {number} eta the gearbox's and the axle's efficiency together
* @property {number[]} gears @property {number} final the axle's ratio
* @property {Engine} engine
* @property {number} Jw one wheel's inertia with its tyre and brake (kg·m²) @property {number} wheels
* @property {{ wb: number, h: number, front: number, loadFront: number, k: [number, number], travel: [number, number] }} axles
*   the wheelbase and the centre of mass's height (m), the kerb's and the load's share on the front axle, each wheel's
*   spring rate front and rear (N/m) and how far each may rise to its bump stop from the kerb's ride height (m)
*/
/** "1st", "2nd" … @param {number} n */
const ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
/**
* A vehicle on the road, stepped in time: a driver holding the speed asked on the grade asked with the load asked,
* changing gear, braking downhill; the engine's speed, torque and fuel; the springs' sag. When the road takes more than
* first gear can give, the speed falls, the engine lugs and stalls, and it stays stalled until `restart`.
* @param {Vehicle} V
*/
function vehicleSolver(V) {
	const E = V.engine;
	const iTot = (g) => V.gears[g - 1] * V.final;
	const tmax = (n) => table(E.rpm, E.nm, n);
	/** the engine's own friction (N·m): its friction mean effective pressure over its displacement, rising with speed */
	const tfric = (n) => E.fmep * (.7 + .15 * n / 1e3) * E.Vd / (4 * Math.PI);
	const rpmOf = (v, g) => v / V.r * iTot(g) * 60 / (2 * Math.PI);
	/** the most the wheels can be pushed in a gear at a speed (N) */
	const fMax = (g, v) => tmax(Math.max(rpmOf(v, g), E.launch)) * iTot(g) * V.eta / V.r;
	/** the mass as the road feels it in a gear: the wheels' and the engine's turning inertia added */
	const mEff = (m, g) => m + (V.wheels * V.Jw + E.J * iTot(g) ** 2 * V.eta) / V.r ** 2;
	const s = {
		v: 0,
		gear: 1,
		rpm: E.idle,
		theta: 0,
		Te: 0,
		Fd: 0,
		Fb: 0,
		a: 0,
		m: V.kerb,
		road: roadLoad({
			m: V.kerb,
			Crr: V.Crr,
			CdA: V.CdA
		}, 0, 0),
		Pw: 0,
		Pe: 0,
		fuel: 0,
		l100: 0,
		launch: false,
		running: true,
		stalled: false,
		why: "",
		need: 0,
		can: 0,
		shiftT: 0,
		sagF: 0,
		sagR: 0,
		loadF: 0,
		loadR: 0,
		bottomed: false,
		wheelAng: 0,
		engAng: 0,
		propAng: 0,
		at: {
			vSet: 0,
			grade: 0,
			load: 0
		}
	};
	/** the gear a driver picks for a speed and a push: the highest that gives it without lugging, else the strongest */
	const pick = (v, F) => {
		let best = 1, bestF = -Infinity;
		for (let g = V.gears.length; g >= 1; g--) {
			const n = rpmOf(v, g);
			if (n > E.max * .96) continue;
			const f = fMax(g, v);
			if (f > bestF) {
				bestF = f;
				best = g;
			}
			if (n < E.down && g > 1) continue;
			if (f >= F * 1.08) return g;
		}
		return best;
	};
	/**
	* @typedef {{ vSet: number, grade: number, load: number }} Input speed asked (m/s), grade (rise over run), load (kg)
	* @param {number} dt @param {Input} inp
	*/
	function step(dt, inp) {
		if (s.stalled) {
			if (Math.abs(inp.vSet - s.at.vSet) > .1 || Math.abs(inp.grade - s.at.grade) > .002 || Math.abs(inp.load - s.at.load) > 1) restart();
		}
		const sub = 10, h = dt / sub;
		s.m = V.kerb + inp.load;
		for (let k = 0; k < sub; k++) {
			const rl = roadLoad({
				m: s.m,
				Crr: V.Crr,
				CdA: V.CdA
			}, s.v, inp.grade);
			s.road = rl;
			const vT = s.stalled ? 0 : inp.vSet;
			const aWant = clamp((vT - s.v) / 2.5, -3, 1.5);
			let mE = mEff(s.m, s.gear);
			if (s.stalled) {
				s.rpm = approach(s.rpm, 0, .12, h);
				s.theta = s.Te = s.Fd = 0;
				s.v = Math.max(0, s.v - 5 * h);
				s.Fb = s.v > 0 ? s.m * 5 : Math.max(0, rl.climb);
				s.a = s.v > 0 ? -5 : 0;
				continue;
			}
			if (vT < .05 && s.v < .05) {
				s.v = 0;
				s.a = 0;
				s.launch = false;
				s.gear = 1;
				s.rpm = approach(s.rpm, E.idle, .3, h);
				s.theta = 0;
				s.Te = 0;
				s.Fd = 0;
				s.Fb = Math.max(0, rl.climb);
				continue;
			}
			s.shiftT -= h;
			if (s.shiftT <= 0) {
				const g = pick(s.v, rl.F + mE * Math.max(0, aWant));
				if (g !== s.gear) {
					s.gear += Math.sign(g - s.gear);
					s.shiftT = .9;
					mE = mEff(s.m, s.gear);
				}
			}
			const nWheels = rpmOf(s.v, s.gear);
			if (s.gear === 1 && nWheels < E.launch && (s.launch || s.v < .3)) s.launch = true;
			if (nWheels >= E.launch || s.gear > 1) s.launch = false;
			const n = s.launch ? E.launch : nWheels;
			const Tm = tmax(n), Tf = tfric(n), i = iTot(s.gear);
			const Fwant = rl.F + mE * aWant;
			const th = clamp((Fwant * V.r / (i * V.eta) + Tf) / (Tm + Tf));
			const Te = th * (Tm + Tf) - Tf;
			const Fd = Te >= 0 ? Te * i * V.eta / V.r : Te * i / (V.eta * V.r);
			const Fb = aWant < 0 ? Math.max(0, Fd - Fwant) : 0;
			const net = Fd - Fb - rl.F;
			s.a = net / mE;
			s.v = Math.max(0, s.v + s.a * h);
			s.theta = th;
			s.Te = Te;
			s.Fd = Fd;
			s.Fb = Fb;
			s.rpm = s.launch ? E.launch : rpmOf(s.v, s.gear);
			const lugged = !s.launch && s.gear === 1 && s.rpm < E.stall && th > .9;
			const noPull = s.launch && s.v <= 0 && net <= 0 && th > .99;
			if (lugged || noPull) {
				s.stalled = true;
				s.running = false;
				s.why = lugged ? "lugged" : "pull";
				s.need = rl.F;
				s.can = fMax(1, s.v);
				s.at = {
					vSet: inp.vSet,
					grade: inp.grade,
					load: inp.load
				};
			}
		}
		const w = s.rpm * 2 * Math.PI / 60;
		s.Pw = s.Fd * s.v;
		s.Pe = s.stalled ? 0 : s.Te * w;
		const overrun = s.theta < .01 && s.rpm > E.idle * 1.3;
		const indicated = s.stalled || overrun ? 0 : Math.max(0, s.Te + tfric(s.rpm)) * w;
		s.fuel = indicated * E.bsfc / 36e5 / FUELS[E.fuel].rho * 3600;
		s.l100 = s.v > .5 ? s.fuel / (s.v * 3.6) * 100 : 0;
		const kF = V.kerb * V.axles.front * G, kR = V.kerb * G - kF;
		const lF = inp.load * V.axles.loadFront * G, lR = inp.load * G - lF;
		const transfer = s.m * (Math.max(-6, Math.min(6, s.a)) + G * Math.sin(s.road.th)) * V.axles.h / V.axles.wb;
		s.loadF = (kF + lF - transfer) / 2;
		s.loadR = (kR + lR + transfer) / 2;
		/** a spring's rise from the kerb's ride height, stiffened tenfold on its bump stop */
		const sag = (dF, k, travel) => {
			const x = dF / k;
			return x > travel ? travel + (x - travel) / 10 : x;
		};
		const sF = sag((lF - transfer) / 2, V.axles.k[0], V.axles.travel[0]), sR = sag((lR + transfer) / 2, V.axles.k[1], V.axles.travel[1]);
		s.bottomed = sF > V.axles.travel[0] || sR > V.axles.travel[1];
		s.sagF = approach(s.sagF, sF, .25, dt);
		s.sagR = approach(s.sagR, sR, .25, dt);
		s.wheelAng += s.v / V.r / 10 * dt;
		s.engAng += w / 40 * dt;
		s.propAng += s.v / V.r * V.final / 40 * dt;
	}
	/** the key turned: it starts in first, on the clutch */
	function restart() {
		s.stalled = false;
		s.running = true;
		s.gear = 1;
		s.launch = true;
		s.rpm = E.idle;
		s.why = "";
	}
	/** start it already running at the speed asked, in the gear for it, settled @param {Input} inp */
	function settle(inp) {
		s.v = inp.vSet;
		s.m = V.kerb + inp.load;
		s.gear = s.v > .5 ? pick(s.v, roadLoad({
			m: s.m,
			Crr: V.Crr,
			CdA: V.CdA
		}, s.v, inp.grade).F) : 1;
		s.rpm = s.v > .5 ? rpmOf(s.v, s.gear) : E.idle;
		for (let k = 0; k < 120; k++) step(.05, inp);
		s.wheelAng = s.engAng = s.propAng = 0;
	}
	return {
		s,
		step,
		settle,
		restart,
		rpmOf,
		fMax,
		tmax,
		tfric,
		iTot,
		pick
	};
}
const _pa = /* @__PURE__ */ (() => new three.Vector3())();
const _pb = /* @__PURE__ */ (() => new three.Vector3())();
const _up = /* @__PURE__ */ (() => new three.Vector3(0, 1, 0))();
/**
* Stand an object built along +y from its origin between two points (in its parent's frame): a link, a rod, an arm's
* leg, a shaft. With `stretch` it is built one metre long and stretched to reach.
* @param {THREE.Object3D} obj @param {V3} a @param {V3} b @param {boolean} [stretch]
*/
function aim(obj, a, b, stretch = false) {
	_pa.set(...a);
	_pb.set(...b).sub(_pa);
	const L = _pb.length();
	obj.position.copy(_pa);
	if (L > 1e-9) obj.quaternion.setFromUnitVectors(_up, _pb.divideScalar(L));
	if (stretch) obj.scale.set(1, Math.max(1e-4, L), 1);
	return L;
}
/** a point of a moving frame (the sprung body) where it is now in its parent's frame @param {THREE.Object3D} frame @param {V3} p @returns {V3} */
function inFrame(frame, p) {
	const v = new three.Vector3(...p).applyMatrix4(frame.matrix);
	return [
		v.x,
		v.y,
		v.z
	];
}
/** a bar one metre long along +y from its origin, for `aim(…, true)` @param {number} r @param {number} [seg] */
const unitBar = (r, seg = 10) => new three.CylinderGeometry(r, r, 1, seg, 1).translate(0, .5, 0);
/**
* A light spur gear (or sprocket, or ring gear) about z: square-cut teeth on its rim, its web between them and its
* bore. Centred on z = 0.
* @param {{ r: number, width: number, module?: number, bore?: number }} o r the pitch radius
*/
function spurGeometry({ r, width, module = .004, bore = .012 }) {
	const teeth = Math.max(8, Math.round(2 * r / module));
	const P = Math.PI * 2 / teeth;
	/** @type {number[]} */
	const angles = [];
	for (let k = 0; k < teeth; k++) angles.push(k * P, k * P + .38 * P, k * P + .5 * P, k * P + .88 * P);
	const rr = r - module, rt = r + module;
	return revolveX([
		[bore, -width / 2],
		[
			rr,
			-width / 2,
			1
		],
		[
			rr,
			width / 2,
			1
		],
		[bore, width / 2]
	], angles, (rad, _x, i, tag) => tag === 1 && i % 4 < 2 ? rt : rad).rotateY(-Math.PI / 2);
}
/**
* The outline round a set of pulleys: their convex hull, each pulley's arc joined to the next by a tangent. `grow`
* widens every pulley (a belt's outer face, or a cover over them).
* @param {[number, number, number][]} cs pulleys [x, y, r] @param {number} [grow]
*/
function beltShape(cs, grow = 0) {
	const s = new three.Shape();
	traceBelt(cs, grow, s);
	return s;
}
/** the same outline as a hole @param {[number, number, number][]} cs @param {number} [grow] */
function beltHole(cs, grow = 0) {
	const p = new three.Path();
	traceBelt(cs, grow, p);
	return p;
}
/** @param {[number, number, number][]} cs @param {number} grow @param {THREE.Path} path */
function traceBelt(cs, grow, path) {
	const cx = cs.reduce((s, c) => s + c[0], 0) / cs.length, cy = cs.reduce((s, c) => s + c[1], 0) / cs.length;
	const P = [...cs].sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)).map(([x, y, r]) => [
		x,
		y,
		r + grow
	]);
	const n = P.length;
	/** the outer tangent's normal angle from pulley i to pulley j, going round anticlockwise */
	const beta = (i, j) => {
		const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], L = Math.hypot(dx, dy);
		return Math.atan2(dy, dx) - Math.acos(clamp((P[i][2] - P[j][2]) / L, -1, 1));
	};
	for (let i = 0; i < n; i++) {
		const a0 = beta((i - 1 + n) % n, i);
		let a1 = beta(i, (i + 1) % n);
		while (a1 < a0) a1 += Math.PI * 2;
		if (i === 0) path.moveTo(P[i][0] + P[i][2] * Math.cos(a0), P[i][1] + P[i][2] * Math.sin(a0));
		path.absarc(P[i][0], P[i][1], P[i][2], a0, a1, false);
	}
	path.closePath();
	return path;
}
/** a belt round pulleys: its band `t` thick and `w` wide, about z @param {[number, number, number][]} cs @param {number} t @param {number} w */
function beltGeometry(cs, t, w) {
	const s = beltShape(cs, t);
	s.holes.push(beltHole(cs, 0));
	return plate(s, w, 8);
}
/**
* A ladder frame: two box-section rails along z through their centre line's (z, y) points, kicked up where the points
* rise (over an axle), joined by tubular crossmembers.
* @param {{ x: number, w: number, h: number, t: number, path: V2[], cross: number[], rCross?: number }} o the rails'
*   middles at ±x, each w wide, h deep, its wall t; its path [z, y] front to back; the crossmembers' z
*/
function ladderFrame({ x, w, h, t, path, cross, rCross = .036 }) {
	const sec = rrect(w, h, .008);
	sec.holes.push(roundHole([
		[-w / 2 + t, -h / 2 + t],
		[w / 2 - t, -h / 2 + t],
		[w / 2 - t, h / 2 - t],
		[-w / 2 + t, h / 2 - t]
	], .004));
	/** @type {THREE.BufferGeometry[]} */
	const out = [];
	for (let i = 0; i < path.length - 1; i++) {
		const [z0, y0] = path[i], [z1, y1] = path[i + 1];
		const L = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0);
		for (const sx of [-1, 1]) out.push(plate(sec, L + h * .25, 4).rotateX(-a).translate(sx * x, (y0 + y1) / 2, (z0 + z1) / 2));
	}
	for (const z of cross) out.push(GEO.tube(rCross, rCross - .004, 2 * x - w + .004, 20).rotateZ(Math.PI / 2).translate(0, frameY(path, z), z));
	return GEO.merge(out);
}
/** the height of a frame's rails at z, along its path @param {V2[]} path @param {number} z */
function frameY(path, z) {
	for (let i = 0; i < path.length - 1; i++) {
		const [z0, y0] = path[i], [z1, y1] = path[i + 1];
		if ((z - z0) * (z - z1) <= 0) return z0 === z1 ? y0 : y0 + (y1 - y0) * (z - z0) / (z1 - z0);
	}
	return path[z > path[0][0] ? 0 : path.length - 1][1];
}
/** the engine room's palette */
function engineMaterials() {
	return {
		block: MAT.castIron({ color: [
			.2,
			.21,
			.22
		] }),
		head: MAT.aluminium({
			color: [
				.72,
				.73,
				.74
			],
			roughness: .48
		}),
		cover: MAT.paint({
			color: [
				.035,
				.035,
				.04
			],
			roughness: .5,
			clearcoat: .2
		}),
		pan: MAT.paint({
			color: [
				.045,
				.045,
				.05
			],
			roughness: .55,
			clearcoat: .1
		}),
		piston: MAT.aluminiumMachined({
			roughness: .3,
			color: [
				.78,
				.78,
				.77
			]
		}),
		rod: MAT.steelDark({ roughness: .36 }),
		crank: MAT.steel({
			roughness: .16,
			color: [
				.6,
				.6,
				.6
			],
			cap: [
				.8,
				.79,
				.76
			],
			capRough: .3
		}),
		gear: MAT.steel({
			roughness: .2,
			finish: "turned",
			cap: [
				.82,
				.81,
				.78
			]
		}),
		belt: MAT.rubber({
			color: [
				.03,
				.03,
				.032
			],
			roughness: .7
		}),
		plastic: MAT.plastic({
			color: [
				.025,
				.025,
				.028
			],
			roughness: .5
		}),
		alloy: MAT.aluminium({
			color: [
				.74,
				.75,
				.76
			],
			roughness: .42
		}),
		line: MAT.steel({
			color: [
				.62,
				.62,
				.63
			],
			roughness: .3
		}),
		manifold: MAT.castIron({
			color: [
				.26,
				.17,
				.12
			],
			roughness: .78
		}),
		oil: MAT.fluid({
			color: [
				.36,
				.2,
				.04
			],
			roughness: .06
		}),
		filter: MAT.paint({
			color: [
				.04,
				.1,
				.32
			],
			roughness: .4
		}),
		black: MAT.paint({
			color: [
				.025,
				.025,
				.028
			],
			roughness: .45,
			clearcoat: .2
		}),
		copper: MAT.copper({ roughness: .35 }),
		yellow: MAT.plastic({
			color: [
				.85,
				.6,
				.02
			],
			roughness: .35
		}),
		friction: MAT.ceramic({
			color: [
				.22,
				.2,
				.17
			],
			roughness: .92
		}),
		hot: MAT.steel({
			color: [
				.42,
				.39,
				.36
			],
			roughness: .55,
			finish: "cast"
		}),
		hose: MAT.rubber({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .6
		})
	};
}
/** @typedef {ReturnType<typeof engineMaterials>} EngineMats */
/**
* @typedef {object} EngineOptions
* @property {THREE.Object3D} parent @property {V3} at the crank's middle, in `parent`
* @property {number} bore @property {number} stroke @property {number} rod @property {number} pitch the bores' spacing (m)
* @property {boolean} [turbo] a turbocharger on the exhaust manifold
* @property {number} [compression] its compression ratio (22 unless said), for the head's card
* @property {boolean} [fan] an engine-driven fan on the water pump (else the radiator has its own)
* @property {'front' | 'rear'} [well] which end of the sump its deep well is at
* @property {number[]} gears the gearbox's ratios, first to top
* @property {V3} lever the gear knob (in the engine's frame)
* @property {[V3, V3]} mounts where the two mounts' rubbers sit on the frame (in the engine's frame)
* @property {V3} rearMount where the gearbox's mount sits on its crossmember (in the engine's frame)
* @property {string} assembly @property {string} gearAssembly @property {string} [source]
* @property {string} name what to call it on its cards ("2.4 L diesel")
* @property {[string, string][]} specs the engine's numbers, for the block's card
* @property {EngineMats} M
* @property {() => string} [tag] the engine's label @property {() => string} [gearTag] the gearbox's
*/
/**
* A four-cylinder inline diesel and its gearbox, each part a mechanic would name as its own solid: the block with its
* bores through it, the head, the camshaft and valves under the cover, the crankshaft with its counterweights, the
* pistons on their rods, the flywheel and clutch, the sump with its oil, the timing belt under its cover, the
* accessory belt over the pulleys of the water pump and alternator, the injection pump and its four lines, the
* manifolds, the starter, the oil filter, the mounts; then the bellhousing and the gearbox with its shafts and gears
* inside, and the lever. In the engine's frame: the crank along z through the origin, the timing end at +z.
* @param {Kit} kit @param {EngineOptions} o
*/
function inlineEngine(kit, o) {
	const { M } = o;
	const r = o.stroke / 2, L = o.rod, p = o.pitch, R = o.bore / 2, n = 4;
	const ch = .05;
	const deck = r + L + ch;
	const lb = n * p / 2 + .02;
	const bw = o.bore + .09;
	const yb = deck - o.stroke - .05;
	const pan = -.075;
	const zc = (i) => (3 / 2 - i) * p;
	const phase = (i) => i === 0 || i === 3 ? 0 : Math.PI;
	const E = new three.Group();
	E.name = "engine";
	E.position.set(...o.at);
	o.parent.add(E);
	const m = (g, mat) => kit.mesh(g, mat);
	/** @param {any} info @param {THREE.Object3D[]} objs @param {import('$lib/assets/parts.js').How} [how] */
	const part = (info, objs, how = {}) => {
		const g = new three.Group();
		g.add(...objs);
		return kit.part(g, {
			assembly: o.assembly,
			source: o.source,
			...info
		}, how, E);
	};
	const spin = () => new three.Group();
	const litres = (n * Math.PI * R * R * o.stroke * 1e3).toFixed(2);
	{
		const top = rrect(bw, 2 * lb, .012);
		for (let i = 0; i < n; i++) top.holes.push(circle(0, -zc(i), R));
		/** @type {THREE.BufferGeometry[]} */
		const g = [onY(plate(top, deck - yb, 28), (deck + yb) / 2)];
		for (const sx of [-1, 1]) {
			const s = new three.Shape();
			s.moveTo(sx * (bw / 2 - .012), yb + .004);
			s.lineTo(sx * (bw / 2), yb + .004);
			s.lineTo(sx * (bw / 2 + .03), pan);
			s.lineTo(sx * (bw / 2 + .018), pan);
			s.closePath();
			g.push(plate(s, 2 * lb, 2));
			g.push(at(box(.03, .07, .09, .006), sx * (bw / 2 + .03), .06, .02));
		}
		for (let k = 0; k <= n; k++) {
			const z = clamp((n / 2 - k) * p, -lb + .011, lb - .011);
			const s = rrect(bw + .03, yb - pan, .004, 0, (yb + pan) / 2);
			s.holes.push(circle(0, 0, .033));
			g.push(plate(s, .022, 20).translate(0, 0, z));
		}
		const rail = rrect(bw + .08, 2 * lb, .01);
		rail.holes.push(rrect(bw + .02, 2 * lb - .03, .006));
		g.push(onY(plate(rail, .012, 6), -.06899999999999999));
		part({
			id: "block",
			label: `Cylinder block, ${o.name}`,
			what: `The cast-iron block: four ${Math.round(o.bore * 1e3)} mm bores bored through its deck, water round them, the crankcase under them with five bulkheads that carry the crankshaft’s main bearings. Everything else on the engine bolts to it.`,
			specs: [["Displacement", `${litres} L (${Math.round(o.bore * 1e3)} × ${Math.round(o.stroke * 1e3)} mm)`], ...o.specs]
		}, [m(GEO.merge(g), M.block)], {
			explode: [
				0,
				0,
				0
			],
			tag: o.tag ? {
				text: o.name,
				at: [
					bw / 2 + .03,
					deck - .05,
					0
				],
				value: o.tag,
				side: "right"
			} : void 0
		});
	}
	part({
		id: "head",
		label: "Cylinder head",
		what: "The aluminium head closing the bores: its ports, the valves’ seats and guides, the camshaft’s bearings and the injectors’ wells; held down on its gasket by ten long bolts.",
		specs: [
			["Material", "Cast aluminium alloy"],
			["Valves", "2 a cylinder, 8 in all"],
			["Compression", `${o.compression ?? 22} : 1 [inferred]`]
		]
	}, [m(at(box(bw + .02, .1, 2 * lb, .008), 0, deck + .054, 0), M.head), m(at(slab(bw + .01, .004, 2 * lb - .01), 0, deck + .002, 0), M.copper)], { explode: [
		0,
		.2,
		0
	] });
	part({
		id: "cam-cover",
		label: "Cam cover",
		what: "The pressed cover over the camshaft and valves, keeping their oil in; its cap is where the oil goes in.",
		specs: [["Material", "Pressed steel, painted"]]
	}, [m(at(box(bw - .008, .07, 2 * lb - .02, .026), 0, deck + .139, 0), M.cover), m(cyl([
		0,
		deck + .172,
		lb - .08
	], [
		0,
		deck + .19,
		lb - .08
	], .024, 24), M.yellow)], {
		explode: [
			0,
			.42,
			0
		],
		xray: "shell"
	});
	const cam = spin();
	{
		const lobe = new three.Shape();
		lobe.absarc(0, 0, .019, Math.PI * .15, Math.PI * .85, true);
		lobe.lineTo(0, .03);
		lobe.closePath();
		/** @type {THREE.BufferGeometry[]} */
		const g = [cyl([
			0,
			0,
			-lb + .01
		], [
			0,
			0,
			lb + .03
		], .012, 14)];
		for (let i = 0; i < n; i++) for (const [dz, ph] of [[.022, 0], [-.022, 1.6]]) g.push(ext(lobe, .014, .001, 6).rotateZ(-phase(i) / 2 - ph - i * .9).translate(0, 0, zc(i) + dz));
		cam.add(m(GEO.merge(g), M.crank));
		cam.position.set(0, deck + .13, 0);
		const valves = [];
		for (let i = 0; i < n; i++) for (const dz of [.022, -.022]) {
			valves.push(m(GEO.merge([
				cyl([
					0,
					deck + .004,
					zc(i) + dz
				], [
					0,
					deck + .1,
					zc(i) + dz
				], .0035, 8),
				latheZ([
					[0, 0],
					[.016, 0],
					[.016, .003],
					[.004, .012],
					[0, .012]
				], 12).rotateX(-Math.PI / 2).translate(0, deck + .001, zc(i) + dz),
				cyl([
					0,
					deck + .098,
					zc(i) + dz
				], [
					0,
					deck + .111,
					zc(i) + dz
				], .016, 10)
			]), M.gear));
			valves.push(m(coil(.012, .0022, 6, .055, 40, 5).translate(0, deck + .042, zc(i) + dz), M.black));
		}
		part({
			id: "camshaft",
			label: "Camshaft and valves",
			what: "One overhead camshaft, turned by the timing belt at half the crank’s speed: its lobes push the eight valves open through their buckets, their springs close them.",
			moves: "Turns at half the crank’s speed (shown 40 times slower).",
			drive: "The timing belt",
			specs: [["Valves", "8, 2 a cylinder"], ["Drive", "Toothed belt, 2 : 1"]]
		}, [cam, ...valves], { explode: [
			0,
			.3,
			0
		] });
	}
	const crank = spin();
	{
		const web = new three.Shape();
		web.moveTo(.0733, -.0267);
		web.lineTo(.036, r);
		web.absarc(0, r, .036, 0, Math.PI, false);
		web.lineTo(-.0733, -.0267);
		web.absarc(0, 0, .078, 200 * Math.PI / 180, 340 * Math.PI / 180, false);
		const g = [];
		for (let k = 0; k <= n; k++) {
			const z = clamp((n / 2 - k) * p, -lb + .011, lb - .011);
			g.push(cyl([
				0,
				0,
				z - .014
			], [
				0,
				0,
				z + .014
			], .03, 16));
		}
		for (let i = 0; i < n; i++) {
			const ph = phase(i), px = r * Math.sin(ph), py = r * Math.cos(ph);
			g.push(cyl([
				px,
				py,
				zc(i) - .017
			], [
				px,
				py,
				zc(i) + .017
			], .028, 16));
			for (const s of [-1, 1]) g.push(ext(web, .018, .0015, 6).rotateZ(-ph).translate(0, 0, zc(i) + s * .026));
		}
		g.push(cyl([
			0,
			0,
			lb - .012
		], [
			0,
			0,
			lb + .1
		], .022, 20), cyl([
			0,
			0,
			-lb + .012
		], [
			0,
			0,
			-lb - .02
		], .05, 28));
		crank.add(m(GEO.merge(g), M.crank));
		part({
			id: "crankshaft",
			label: "Crankshaft",
			what: "The forged crankshaft on its five main bearings: its four pins, two up and two down, turn the pistons’ push into torque; the counterweights opposite them balance it.",
			moves: "Turns at the engine’s speed (shown 40 times slower).",
			drive: "The pistons, through the rods",
			specs: [
				["Stroke", `${Math.round(o.stroke * 1e3)} mm`],
				["Main bearings", "5"],
				["Firing order", "1-3-4-2"]
			]
		}, [crank], { explode: [
			0,
			-.45,
			0
		] });
	}
	/** @type {THREE.Group[]} */
	const pistons = [];
	/** @type {THREE.Group[]} */
	const rods = [];
	{
		const Rp = R - 5e-4;
		/** @type {V2[]} */
		const prof = [
			[0, .042],
			[R * .3, .033],
			[R * .56, .048],
			[Rp, ch]
		];
		for (const y of [.041, .031000000000000003]) prof.push([Rp, y], [Rp - .003, y], [Rp - .003, y - .002], [Rp, y - .002]);
		prof.push([Rp, -.035], [R - .006, -.035], [R - .006, .020000000000000004], [0, .020000000000000004]);
		const pg = latheY(prof, 24);
		const pin = cyl([
			-(R - .004),
			0,
			0
		], [
			R - .004,
			0,
			0
		], .0135, 16);
		const rod = new three.Shape();
		const R1 = .045, R2 = .022, wb = .016, wt = .01;
		const y1 = Math.sqrt(R1 * R1 - wb * wb), y2 = L - Math.sqrt(R2 * R2 - wt * wt);
		rod.moveTo(wb, y1);
		rod.absarc(0, 0, R1, Math.atan2(y1, wb), Math.atan2(y1, -.016), true);
		rod.lineTo(-.01, y2);
		rod.absarc(0, L, R2, Math.atan2(y2 - L, -.01), Math.atan2(y2 - L, wt), true);
		rod.closePath();
		rod.holes.push(circle(0, 0, .0285), circle(0, L, .0137));
		const rodG = GEO.merge([
			ext(rod, .024, .0015, 7),
			cyl([
				.033,
				-.03,
				0
			], [
				.033,
				.012,
				0
			], .006, 8),
			cyl([
				-.033,
				-.03,
				0
			], [
				-.033,
				.012,
				0
			], .006, 8)
		]);
		for (let i = 0; i < n; i++) {
			const pis = new three.Group();
			pis.add(m(pg, M.piston), m(pin, M.crank));
			pis.position.z = zc(i);
			pistons.push(pis);
			const rd = new three.Group();
			rd.add(m(rodG, M.rod));
			rd.position.z = zc(i);
			rods.push(rd);
		}
		part({
			id: "pistons",
			label: "Pistons",
			count: 4,
			what: "Four cast-aluminium pistons, the combustion bowl in each crown where the fuel is sprayed, three rings sealing them in their bores; each pushed down by its burning charge.",
			moves: "Up and down their bores (shown 40 times slower).",
			drive: "The burning charge; they drive the rods",
			specs: [["Diameter", `${Math.round(o.bore * 1e3)} mm`], ["Rings", "2 compression, 1 oil"]]
		}, pistons, { explode: [
			0,
			.62,
			0
		] });
		part({
			id: "rods",
			label: "Connecting rods",
			count: 4,
			what: "Forged steel I-section rods from each piston’s pin to its crank pin, their big ends split and bolted round the pins on shell bearings.",
			moves: "Swing and slide with the pistons.",
			drive: "The pistons; they drive the crankshaft",
			specs: [["Length", `${Math.round(L * 1e3)} mm between centres`]]
		}, rods, { explode: [
			0,
			.52,
			0
		] });
	}
	const fly = spin();
	const clutchSpin = spin();
	fly.add(m(GEO.merge([latheZ([
		[.05, 0],
		[.15, 0],
		[.15, -.03],
		[.11, -.03],
		[.11, -.018],
		[.05, -.018]
	], 48), spurGeometry({
		r: .163,
		width: .018,
		module: .008,
		bore: .148
	}).translate(0, 0, -.012)]), M.gear));
	fly.position.z = -lb - .02;
	part({
		id: "flywheel",
		label: "Flywheel",
		what: "A heavy steel disc on the crank’s back end: it carries the engine through the strokes between firings and is the clutch’s friction face; the starter turns its ring gear.",
		moves: "Turns with the crankshaft.",
		specs: [["Ring gear", "60 teeth [inferred]"]]
	}, [fly], { explode: [
		0,
		0,
		-.32
	] });
	clutchSpin.add(m(GEO.merge([GEO.shell([
		[.14, 0],
		[.14, -.022],
		[.06, -.034]
	], .004, 40).rotateX(Math.PI / 2)]), M.gear), m(latheZ([
		[.075, .002],
		[.122, .002],
		[.122, -.006],
		[.075, -.006]
	], 40), M.friction));
	clutchSpin.position.z = -lb - .054;
	part({
		id: "clutch",
		label: "Clutch",
		what: "A friction disc pressed against the flywheel by the cover’s diaphragm spring: it passes the engine’s torque to the gearbox, and slips to let the vehicle pull away.",
		moves: "Turns with the flywheel; slips while it pulls away.",
		drive: "The pedal, through its cable and release bearing",
		specs: [["Disc", "Ø 240 mm, dry single plate [inferred]"]]
	}, [clutchSpin], { explode: [
		0,
		0,
		-.5
	] });
	{
		const sw = bw + .05, deep = o.well === "front" ? 1 : -1;
		const ring = (w, l, t) => {
			const s = rrect(w, l, .025);
			s.holes.push(rrect(w - 2 * t, l - 2 * t, .02));
			return s;
		};
		const half = lb - .01, z0 = deep * half / 2;
		const g = [
			onY(plate(ring(sw, 2 * half, .003), .06, 8), -.105),
			onY(plate(rrect(sw, half, .025), .003, 8), -.135).translate(0, 0, -z0),
			onY(plate(ring(sw, half, .003), .1, 8), -.185).translate(0, 0, z0),
			onY(plate(rrect(sw, half, .025), .003, 8), -.235).translate(0, 0, z0),
			cyl([
				0,
				-.235,
				z0
			], [
				0,
				-.247,
				z0
			], .01, 6)
		];
		part({
			id: "sump",
			label: "Sump",
			what: "The pressed-steel oil pan under the crankcase, deep at one end where the pump’s pickup draws the oil; its drain plug at the bottom.",
			specs: [["Oil", "6.5 L, 15W-40 [inferred]"]]
		}, [m(GEO.merge(g), M.pan), m(at(box(sw - .01, .07, half - .01, .01), 0, -.197, z0), M.oil)], {
			explode: [
				0,
				-.3,
				0
			],
			xray: "shell"
		});
	}
	const tCrank = spin(), tCam = spin(), tPump = spin();
	const pumpXY = [bw / 2 + .06, .1];
	{
		const cs = [
			[
				0,
				0,
				.03
			],
			[
				0,
				deck + .13,
				.06
			],
			[
				pumpXY[0],
				pumpXY[1],
				.06
			]
		];
		const zt = lb + .022;
		const cover = ext(beltShape(cs, .024), .032, .003, 8).translate(0, 0, zt + .006);
		tCrank.add(m(spurGeometry({
			r: .03,
			width: .024,
			module: .004,
			bore: .022
		}), M.gear));
		tCam.add(m(spurGeometry({
			r: .06,
			width: .024,
			module: .006,
			bore: .012
		}), M.gear));
		tPump.add(m(spurGeometry({
			r: .06,
			width: .024,
			module: .006,
			bore: .012
		}), M.gear));
		tCrank.position.set(0, 0, zt);
		tCam.position.set(0, deck + .13, zt);
		tPump.position.set(pumpXY[0], pumpXY[1], zt);
		part({
			id: "timing",
			label: "Timing belt and cover",
			what: "A toothed belt from the crank to the camshaft and the injection pump, both turning at half the crank’s speed so each valve and each squirt of fuel comes at its stroke; under its plastic cover.",
			moves: "The belt runs round its three sprockets.",
			drive: "The crankshaft",
			specs: [["Belt", "Toothed, 25 mm wide [inferred]"], ["Change", "Every 100,000 km [inferred]"]]
		}, [
			tCrank,
			tCam,
			tPump,
			m(beltGeometry(cs, .006, .025).translate(0, 0, zt), M.belt),
			m(cover, M.plastic)
		], { explode: [
			0,
			.12,
			.38
		] });
	}
	const aCrank = spin(), aPump = spin(), aAlt = spin();
	const wpXY = [-.03, .2], altXY = [-(bw / 2 + .09), .09];
	const za = lb + .08;
	{
		const groove = (rr, w) => latheZ([
			[.02, -w / 2],
			[rr, -w / 2],
			[rr - .006, 0],
			[rr, w / 2],
			[.02, w / 2]
		], 40);
		aCrank.add(m(GEO.merge([groove(.075, .022), latheZ([
			[.02, .011],
			[.06, .011],
			[.06, .03],
			[.02, .03]
		], 40)]), M.black));
		aPump.add(m(groove(.055, .022), M.black));
		aAlt.add(m(groove(.032, .02), M.gear));
		aCrank.position.set(0, 0, za);
		aPump.position.set(wpXY[0], wpXY[1], za);
		aAlt.position.set(altXY[0], altXY[1], za);
		const cs = [
			[
				0,
				0,
				.073
			],
			[
				wpXY[0],
				wpXY[1],
				.053
			],
			[
				altXY[0],
				altXY[1],
				.03
			]
		];
		const pumpBody = GEO.merge([cyl([
			wpXY[0],
			wpXY[1],
			lb + .04
		], [
			wpXY[0],
			wpXY[1],
			za - .01
		], .022, 16), at(box(.1, .1, .03, .01), wpXY[0], wpXY[1] - .02, lb + .045)]);
		part({
			id: "accessory-drive",
			label: "Accessory belt and water pump",
			what: "A V-belt from the crank’s pulley (its damper behind) round the water pump’s and the alternator’s: the pump drives the coolant through the block, the head and the radiator.",
			moves: "The belt and pulleys turn with the engine.",
			drive: "The crankshaft",
			specs: [["Belt", "V-belt, 10 mm [inferred]"], ["Water pump", "Centrifugal, ~120 L/min at 4,000 rpm [inferred]"]]
		}, [
			aCrank,
			aPump,
			m(beltGeometry(cs, .008, .012).translate(0, 0, za), M.belt),
			m(pumpBody, M.alloy)
		], { explode: [
			0,
			.06,
			.6
		] });
		part({
			id: "alternator",
			label: "Alternator",
			what: "Turned by the belt at about 2.5 times the crank’s speed, it charges the battery and runs the lights.",
			moves: "Its rotor and pulley turn with the belt.",
			drive: "The accessory belt",
			specs: [["Output", "14 V, 70 A [inferred]"]]
		}, [m(GEO.merge([latheZ([
			[0, -.11],
			[.058, -.11],
			[.062, -.09],
			[.062, -.02],
			[.05, 0],
			[0, 0]
		], 32).translate(altXY[0], altXY[1], za - .016), at(box(.03, .05, .04, .004), altXY[0] + .05, altXY[1] - .04, za - .08)]), M.alloy), aAlt], { explode: [
			-.3,
			0,
			.3
		] });
		if (o.fan) {
			const fan = spin();
			fan.add(m(GEO.rotor({
				count: 7,
				axis: "z",
				r0: .055,
				r1: .2,
				chord: [.05, .065],
				thick: .06,
				camber: .08,
				twist: .4,
				pitch: .45,
				nS: 5,
				nC: 7
			}), M.plastic), m(latheZ([
				[0, 0],
				[.06, 0],
				[.065, .02],
				[.06, .045],
				[0, .045]
			], 32).translate(0, 0, -.045), M.alloy));
			fan.position.set(wpXY[0], wpXY[1], za + .06);
			aPump.userData.fan = fan;
			part({
				id: "fan",
				label: "Fan and viscous coupling",
				what: "Seven plastic blades on the water pump’s hub through a viscous coupling: it pulls air through the radiator, slipping when the air is cool.",
				moves: "Turns with the water pump.",
				drive: "The water pump",
				specs: [["Diameter", "400 mm [inferred]"]]
			}, [fan], { explode: [
				0,
				.1,
				.8
			] });
		}
	}
	{
		const [px, py] = pumpXY, z0 = lb - 0, z1 = lb - .21;
		const body = GEO.merge([
			latheZ([
				[0, 0],
				[.05, 0],
				[.05, -.12],
				[.045, -.13],
				[.045, -.21],
				[0, -.21]
			], 32).translate(px, py, z0),
			at(box(.07, .06, .06, .008), px, py + .055, z0 - .17),
			cyl([
				px,
				py + .08,
				z0 - .06
			], [
				px + .02,
				py + .11,
				z0 - .06
			], .006, 8)
		]);
		const lines = [], inj = [];
		const ix = bw / 2 + .012, iy = deck + .03;
		for (let i = 0; i < n; i++) {
			const sx = px - .02 + i % 2 * .04, sz = z1 + .045 + Math.floor(i / 2) * .03;
			lines.push(hose([
				[
					sx,
					py + .085,
					sz
				],
				[
					sx + .01,
					py + .12,
					sz
				],
				[
					ix + .05,
					iy + 0,
					(sz + zc(i)) / 2
				],
				[
					ix + .035,
					iy,
					zc(i)
				]
			], .003, 6));
			inj.push(cyl([
				ix - .01,
				iy,
				zc(i)
			], [
				ix + .04,
				iy,
				zc(i)
			], .011, 12), hex([
				ix + .012,
				iy,
				zc(i)
			], [
				1,
				0,
				0
			], .014, .012));
		}
		const glow = [];
		for (let i = 0; i < n; i++) glow.push(cyl([
			-bw / 2 - .016,
			deck + .025,
			zc(i)
		], [
			-bw / 2 + .01,
			deck + .025,
			zc(i)
		], .005, 8), hex([
			-bw / 2 - .016,
			deck + .025,
			zc(i)
		], [
			-1,
			0,
			0
		], .007, .008));
		part({
			id: "injection",
			label: "Injection pump, lines and injectors",
			what: "The distributor pump, turned by the timing belt, meters the fuel and squeezes it to some 300 bar into each injector in turn through its own steel line, at the moment its piston comes up on compression; the glow plugs on the other side warm the chambers for a cold start.",
			moves: "Its shaft turns at half the crank’s speed.",
			drive: "The timing belt",
			specs: [
				["Pump", "Rotary distributor [inferred]"],
				["Injection", "Indirect, ~130 bar opening [inferred]"],
				["Glow plugs", "4, 11 V"]
			]
		}, [
			m(body, M.alloy),
			m(GEO.merge(lines), M.line),
			m(GEO.merge(inj), M.gear),
			m(GEO.merge(glow), M.gear)
		], { explode: [
			.36,
			.1,
			0
		] });
	}
	const intakeIn = [
		bw / 2 + .085,
		deck + .09,
		-lb + .02
	];
	let exhaustOut = [
		-(bw / 2 + .065),
		deck - .06,
		-lb + .07
	];
	{
		/** @type {THREE.BufferGeometry[]} */
		const g = [cyl([
			bw / 2 + .085,
			deck + .09,
			-lb + .03
		], [
			bw / 2 + .085,
			deck + .09,
			lb - .04
		], .034, 20)];
		for (let i = 0; i < n; i++) g.push(hose([
			[
				bw / 2 + .006,
				deck + .065,
				zc(i)
			],
			[
				bw / 2 + .04,
				deck + .07,
				zc(i)
			],
			[
				bw / 2 + .07,
				deck + .085,
				zc(i)
			]
		], .019, 12));
		part({
			id: "intake",
			label: "Intake manifold",
			what: "The cast-aluminium manifold that shares the air from the filter among the four inlet ports.",
			specs: [["Material", "Cast aluminium"]]
		}, [m(GEO.merge(g), M.alloy)], { explode: [
			.42,
			.2,
			0
		] });
		/** @type {THREE.BufferGeometry[]} */
		const e = [cyl([
			-(bw / 2 + .065),
			deck + .045,
			-lb + .04
		], [
			-(bw / 2 + .065),
			deck + .045,
			lb - .04
		], .03, 20), cyl([
			-(bw / 2 + .065),
			deck + .045,
			-lb + .07
		], [
			-(bw / 2 + .065),
			deck - .05,
			-lb + .07
		], .028, 16)];
		for (let i = 0; i < n; i++) e.push(hose([
			[
				-bw / 2 - .006,
				deck + .05,
				zc(i)
			],
			[
				-bw / 2 - .035,
				deck + .05,
				zc(i)
			],
			[
				-bw / 2 - .06,
				deck + .045,
				zc(i)
			]
		], .019, 12));
		/** @type {THREE.Mesh[]} */
		const parts = [m(GEO.merge(e), M.manifold)];
		if (o.turbo) {
			const tx = -(bw / 2 + .12), ty = deck - .02, tz = -lb + .09;
			parts.push(m(GEO.merge([latheX([
				[0, -.07],
				[.055, -.07],
				[.07, -.05],
				[.07, -.02],
				[.03, -.012],
				[.03, .012],
				[.065, .02],
				[.075, .045],
				[.06, .07],
				[0, .07]
			], 32).translate(tx, ty, tz)]), M.hot));
			parts.push(m(hose([
				[
					tx,
					ty + .07,
					tz
				],
				[
					tx + .02,
					deck + .2,
					tz + .1
				],
				[
					0,
					deck + .22,
					lb + 0
				],
				[
					bw / 2 + .085,
					deck + .13,
					lb + 0
				],
				[
					bw / 2 + .085,
					deck + .1,
					lb - .04
				]
			], .028, 14), M.alloy));
			exhaustOut = [
				tx - .02,
				ty - .07,
				tz
			];
		}
		part(o.turbo ? {
			id: "exhaust-manifold",
			label: "Exhaust manifold and turbocharger",
			what: "The cast-iron manifold gathers the four cylinders’ gas into the turbocharger’s turbine; its compressor on the same shaft pushes the air into the intake at up to 0.9 bar.",
			moves: "The turbo’s shaft spins at up to 150,000 rpm (not shown turning).",
			drive: "The exhaust gas",
			specs: [["Boost", "0.9 bar [inferred]"], ["Manifold", "Cast iron"]]
		} : {
			id: "exhaust-manifold",
			label: "Exhaust manifold",
			what: "The cast-iron manifold gathering the four cylinders’ hot gas into the downpipe.",
			specs: [["Material", "Cast iron"], ["Gas", "Up to ~650 °C at full load [inferred]"]]
		}, parts, { explode: [
			-.42,
			.18,
			0
		] });
	}
	{
		part({
			id: "oil-filter",
			label: "Oil filter and dipstick",
			what: "A spin-on full-flow filter that the oil pump pushes all the oil through before the bearings; the dipstick to check its level.",
			specs: [["Filter", "Spin-on, Ø 93 mm [inferred]"]]
		}, [
			m(cyl([
				bw / 2 + .03,
				0,
				-.08
			], [
				bw / 2 + .12,
				-.04,
				-.08
			], .046, 28), M.filter),
			m(hose([
				[
					-bw / 2 - .004,
					.04,
					.05
				],
				[
					-bw / 2 - .03,
					deck - .05,
					.07
				],
				[
					-bw / 2 - .035,
					deck + .13,
					.08
				]
			], .005, 8), M.line),
			m(cyl([
				-bw / 2 - .035,
				deck + .13,
				.08
			], [
				-bw / 2 - .035,
				deck + .15,
				.08
			], .012, 12), M.yellow)
		], { explode: [
			.3,
			-.1,
			0
		] });
		const sx = -.155, sy = -.075;
		part({
			id: "starter",
			label: "Starter motor",
			what: "A 12 V motor on the bellhousing’s flange: its solenoid throws its pinion into the flywheel’s ring gear and it spins the engine to start it.",
			specs: [["Power", "2.2 kW, 12 V [inferred]"]]
		}, [m(GEO.merge([cyl([
			sx,
			sy,
			-lb - .02
		], [
			sx,
			sy,
			-lb + .15
		], .045, 24), cyl([
			-.125,
			-.024999999999999994,
			-lb + 0
		], [
			-.125,
			-.024999999999999994,
			-lb + .11
		], .026, 16)]), M.black)], { explode: [
			-.3,
			-.12,
			0
		] });
	}
	{
		const g = [], rub = [];
		for (const [k, mp] of o.mounts.entries()) {
			const from = [
				(k === 0 ? 1 : -1) * (bw / 2 + .045),
				.06,
				.02
			];
			g.push(cyl(from, [
				mp[0],
				mp[1] + .045,
				mp[2]
			], .012, 10), at(box(.07, .008, .08, .002), mp[0], mp[1] + .05, mp[2]), at(box(.08, .008, .09, .002), mp[0], mp[1] - .004, mp[2]));
			rub.push(cyl([
				mp[0],
				mp[1],
				mp[2]
			], [
				mp[0],
				mp[1] + .046,
				mp[2]
			], .032, 20));
		}
		const rm = o.rearMount;
		g.push(at(box(.12, .008, .07, .002), rm[0], rm[1] + .045, rm[2]), at(box(.14, .008, .08, .002), rm[0], rm[1] - .004, rm[2]));
		rub.push(cyl([
			rm[0],
			rm[1],
			rm[2]
		], [
			rm[0],
			rm[1] + .042,
			rm[2]
		], .035, 20));
		part({
			id: "engine-mounts",
			label: "Engine and gearbox mounts",
			count: 3,
			what: "Rubber blocks between the engine’s brackets and the frame, and under the gearbox’s tail: they carry its weight and its torque and keep its shake out of the body.",
			specs: [["Rubber", "Bonded, ~55 Shore A [inferred]"]]
		}, [m(GEO.merge(g), M.black), m(GEO.merge(rub), M.hose)], { explode: [
			0,
			-.2,
			0
		] });
	}
	const zg = -lb - .2, zt = zg - .32, zo = zt - .16;
	const gin = spin(), glay = spin(), gout = spin(), flange = spin();
	/** @type {{ g: THREE.Group, k: number }[]} */
	const freeGears = [];
	{
		const bell = GEO.shell([
			[.205, -lb - .004],
			[.205, -lb - .03],
			[.175, -lb - .1],
			[.13, -lb - .17],
			[.11, zg]
		], .007, 48).rotateX(Math.PI / 2);
		const flangeR = latheZ([
			[.11, -lb + .002],
			[.215, -lb + .002],
			[.215, -lb - .012],
			[.11, -lb - .012]
		], 48);
		const caseG = GEO.merge([at(box(.2, .25, zg - zt, .03), 0, -.04, (zg + zt) / 2), latheZ([
			[0, zt + .01],
			[.075, zt + .01],
			[.06, zt - .07],
			[.048, zo + .012],
			[0, zo + .012]
		], 32)]);
		const d = .085, c = 1.6;
		const yl = -.085;
		const sh = [cyl([
			0,
			0,
			zg + .05
		], [
			0,
			0,
			zo + .01
		], .016, 12)];
		glay.position.set(0, yl, 0);
		gin.add(m(spurGeometry({
			r: d / 2.6,
			width: .022,
			module: .005
		}).translate(0, 0, zg - .03), M.gear));
		glay.add(m(GEO.merge([cyl([
			0,
			0,
			zg - .01
		], [
			0,
			0,
			zt + .02
		], .014, 12), spurGeometry({
			r: d * c / 2.6,
			width: .022,
			module: .005
		}).translate(0, 0, zg - .03)]), M.gear));
		o.gears.filter((g) => Math.abs(g - 1) > .02).forEach((ig, k) => {
			const rl = d / (1 + ig / c), rm = d - rl, z = zg - .075 - k * .05;
			glay.add(m(spurGeometry({
				r: rl,
				width: .018,
				module: .005
			}).translate(0, 0, z), M.gear));
			const fg = spin();
			fg.add(m(spurGeometry({
				r: rm,
				width: .018,
				module: .005,
				bore: .018
			}), M.gear));
			fg.position.z = z;
			freeGears.push({
				g: fg,
				k: 1 / ig
			});
		});
		gout.add(m(GEO.merge(sh), M.crank));
		flange.add(m(GEO.merge([latheZ([
			[.015, 0],
			[.05, 0],
			[.05, -.012],
			[.015, -.012]
		], 24)]), M.rod));
		flange.position.z = zo;
		part({
			id: "bellhousing",
			label: "Bellhousing",
			assembly: o.gearAssembly,
			what: "The cast-aluminium bell bolted to the block’s back face round the flywheel and clutch, carrying the gearbox and the starter.",
			specs: [["Material", "Cast aluminium"]]
		}, [m(GEO.merge([bell, flangeR]), M.alloy)], {
			explode: [
				0,
				0,
				-.75
			],
			xray: "shell"
		});
		part({
			id: "gearbox",
			label: `Gearbox, ${o.gears.length} speeds`,
			assembly: o.gearAssembly,
			what: `A ${o.gears.length}-speed manual gearbox: the input shaft from the clutch drives the layshaft below it, whose gears turn the gears riding free on the output shaft; the lever slides a synchro collar to lock one of them to the shaft (top gear locks the input to the output straight).`,
			specs: [["Ratios", o.gears.map((g) => g.toFixed(2)).join(" · ")], ["Oil", "2.2 L, 75W-90 [inferred]"]]
		}, [m(caseG, M.alloy)], {
			explode: [
				0,
				0,
				-1
			],
			xray: "shell",
			tag: o.gearTag ? {
				text: "Gearbox",
				at: [
					.1,
					.06,
					(zg + zt) / 2
				],
				value: o.gearTag,
				side: "right"
			} : void 0
		});
		part({
			id: "gear-train",
			label: "Shafts and gears",
			assembly: o.gearAssembly,
			what: "Inside the case: the input shaft and its gear, the layshaft and its cluster, the output shaft with the gears that ride on it, all in constant mesh; the synchro collars between them.",
			moves: "The shafts and gears turn (shown 40 times slower).",
			drive: "The clutch",
			specs: [["Mesh", "Constant, helical in the case [simplified straight here]"]]
		}, [
			gin,
			glay,
			gout,
			...freeGears.map((f) => f.g),
			flange
		], { explode: [
			0,
			-.35,
			-1
		] });
		const lv = o.lever;
		const base = [
			0,
			.09,
			zt + .08
		];
		part({
			id: "gear-lever",
			label: "Gear lever",
			assembly: o.gearAssembly,
			what: "The lever and its rod into the gearbox’s selector: across to pick a gate, forward and back to choose a gear.",
			moves: "Moved by hand; the solver changes gear by itself.",
			specs: [["Pattern", o.gears.length === 5 ? "1-2 · 3-4 · 5-R" : "1-2 · 3-4"]]
		}, [
			m(GEO.merge([cyl(base, lv, .008, 10)]), M.crank),
			m(new three.SphereGeometry(.024, 16, 12).translate(...lv), M.black),
			m(latheY([
				[0, -.01],
				[.04, -.01],
				[.015, .07],
				[0, .07]
			], 20).translate(base[0], base[1], base[2]), M.hose)
		], { explode: [
			0,
			.3,
			-.6
		] });
	}
	return {
		group: E,
		/** points of the engine (in its parent's frame) other things hang on */
		points: {
			out: [
				o.at[0],
				o.at[1],
				o.at[2] + zo - .012
			],
			exhaust: [
				o.at[0] + exhaustOut[0],
				o.at[1] + exhaustOut[1],
				o.at[2] + exhaustOut[2]
			],
			intake: [
				o.at[0] + intakeIn[0],
				o.at[1] + intakeIn[1],
				o.at[2] + intakeIn[2]
			],
			waterOut: [
				o.at[0],
				o.at[1] + deck + .08,
				o.at[2] + lb + .01
			],
			waterIn: [
				o.at[0] + wpXY[0],
				o.at[1] + wpXY[1] - .06,
				o.at[2] + lb + .05
			],
			front: o.at[2] + za + .03
		},
		size: {
			lb,
			deck,
			bw,
			za
		},
		/**
		* Turn it: the crank to `a` (rad, the shown angle), the gearbox's output with the propshaft `ap`.
		* @param {number} a @param {number} ap @param {boolean} [slipping] the clutch slipping (pulling away)
		*/
		update(a, ap, slipping = false) {
			crank.rotation.z = fly.rotation.z = clutchSpin.rotation.z = -a;
			tCrank.rotation.z = aCrank.rotation.z = -a;
			cam.rotation.z = tCam.rotation.z = tPump.rotation.z = -a / 2;
			aPump.rotation.z = -a * 1.36;
			const fan = aPump.userData.fan;
			if (fan) fan.rotation.z = -a * 1.36;
			aAlt.rotation.z = -a * 2.3;
			const ain = slipping ? -a * .6 : -a;
			gin.rotation.z = ain;
			glay.rotation.z = -ain / 1.6;
			for (const f of freeGears) f.g.rotation.z = ain * f.k;
			gout.rotation.z = flange.rotation.z = -ap;
			for (let i = 0; i < n; i++) {
				const t = a + phase(i), px = r * Math.sin(t), py = r * Math.cos(t);
				const yp = py + Math.sqrt(L * L - px * px);
				pistons[i].position.y = yp;
				rods[i].position.set(px, py, zc(i));
				rods[i].rotation.z = Math.atan2(px, yp - py);
			}
		}
	};
}
/** about +y, from [r, y] points (the plain lathe, for a symmetry about the vertical) @param {V2[]} pts @param {number} [seg] */
const latheY = (pts, seg = 48) => GEO.lathe(pts, seg);
/**
* @typedef {object} WishboneOptions
* @property {string} id @property {string} label
* @property {ReturnType<typeof wheelCorner>} corner its wheel: its ball joints and tie rod's end (in the root's frame)
* @property {THREE.Object3D} body the sprung frame the bushes, the spring's top and the rack are on
* @property {[V3, V3]} upper @property {[V3, V3]} lower each arm's front and rear bushes (in the body's frame)
* @property {V3} top the coilover's top mount (in the body's frame) @property {number} [on] how far out along the lower arm its bottom is
* @property {V3} rack the tie rod's inner end (in the body's frame)
* @property {{ R: number, wire: number, turns: number, k: number }} coil its spring and rate (N/m at the wheel)
* @property {VehicleMats} M @property {string} assembly @property {string} [source]
* @property {import('$lib/assets/parts.js').How['tag']} [tag]
*/
/**
* One side of a double-wishbone front suspension: the upper and lower A-arms from their bushes on the body to the
* knuckle's ball joints, the coilover from the lower arm to its tower, the tie rod from the rack to the steering arm.
* Each leg, rod and damper is re-aimed every moment between where the body has sagged to and where the wheel is.
* @param {Kit} kit @param {WishboneOptions} o
*/
function doubleWishbone(kit, o) {
	const { M } = o;
	const m = (g, mat) => kit.mesh(g, mat);
	const bushG = new three.CylinderGeometry(.024, .024, .055, 16).rotateX(Math.PI / 2);
	const arm = (rr) => {
		const g = new three.Group();
		const a = m(unitBar(rr), M.chassis), b = m(unitBar(rr), M.chassis), s = [m(bushG, M.bush), m(bushG, M.bush)];
		g.add(a, b, ...s);
		return {
			g,
			a,
			b,
			s
		};
	};
	const up = arm(.013), lo = arm(.018);
	kit.part(up.g, {
		id: `upper-arm-${o.id}`,
		label: `Upper wishbone, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A pressed and welded A-arm from two rubber bushes on the frame to the knuckle’s upper ball joint: with the lower arm it holds the wheel upright as it rises and falls.",
		moves: "Swings about its bushes as the body rises and sinks on its springs.",
		specs: [["Bushes", "Rubber, bonded"]]
	}, { explode: [
		.06 * Math.sign(o.corner.joints.upper[0]),
		.16,
		0
	] });
	kit.part(lo.g, {
		id: `lower-arm-${o.id}`,
		label: `Lower wishbone, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "The longer, stronger lower A-arm: it carries the coil spring’s load from the knuckle’s lower ball joint to the frame and takes the braking forces.",
		moves: "Swings about its bushes as the body rises and sinks.",
		specs: [["Material", "Pressed steel, welded box"]]
	}, { explode: [
		.06 * Math.sign(o.corner.joints.upper[0]),
		-.18,
		0
	] });
	const tele = telescope({
		body: .24,
		rod: .2,
		rBody: .025,
		coil: {
			R: o.coil.R,
			wire: o.coil.wire,
			turns: o.coil.turns,
			seat: .11
		},
		M,
		mesh: kit.mesh
	});
	kit.part(new three.Group().add(tele.group), {
		id: `coilover-${o.id}`,
		label: `Coil spring and damper, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "A coil spring round a telescopic damper from the lower arm up to its tower on the frame: the spring carries the body, the damper’s oil forced through its valves stops it bouncing.",
		moves: "Shortens as the load or the climb presses the front down; lengthens as it lifts.",
		drive: "The road, through the lower arm",
		specs: [["Spring rate", `${Math.round(o.coil.k / 1e3)} kN/m at the wheel [inferred]`], ["Damper", "Twin tube, gas [inferred]"]]
	}, {
		explode: [
			.1 * Math.sign(o.corner.joints.upper[0]),
			.3,
			0
		],
		tag: o.tag
	});
	const tie = m(unitBar(.011), M.forged);
	const boot = m(GEO.lathe([
		[0, 0],
		[.02, 0],
		[.024, .02],
		[.016, .04],
		[.022, .06],
		[.012, .09],
		[0, .09]
	], 16), M.boot);
	kit.part(new three.Group().add(tie, boot), {
		id: `tie-rod-${o.id}`,
		label: `Tie rod, ${o.label}`,
		assembly: o.assembly,
		source: o.source,
		what: "From the steering rack’s end to the knuckle’s steering arm: as the rack slides, it pushes or pulls the arm and turns the wheel about its ball joints. Its threaded end sets the toe.",
		moves: "Follows the rack and the wheel.",
		drive: "The steering rack",
		specs: [["Toe-in", "2 mm [inferred]"]]
	}, { explode: [
		0,
		-.06,
		.12
	] });
	const J = o.corner.joints;
	const lerp3 = (a, b, t) => [
		a[0] + (b[0] - a[0]) * t,
		a[1] + (b[1] - a[1]) * t,
		a[2] + (b[2] - a[2]) * t
	];
	return { 
	/** re-aim every piece between the body (as it is now) and the wheel */
update() {
		const [uf, ur] = o.upper.map((q) => inFrame(o.body, q)), [lf, lr] = o.lower.map((q) => inFrame(o.body, q));
		aim(up.a, uf, J.upper, true);
		aim(up.b, ur, J.upper, true);
		up.s[0].position.set(...uf);
		up.s[1].position.set(...ur);
		aim(lo.a, lf, J.lower, true);
		aim(lo.b, lr, J.lower, true);
		lo.s[0].position.set(...lf);
		lo.s[1].position.set(...lr);
		tele.set(lerp3(lerp3(lf, lr, .5), J.lower, o.on ?? .62), inFrame(o.body, o.top));
		const rk = inFrame(o.body, o.rack);
		aim(tie, rk, J.tie, true);
		aim(boot, rk, J.tie);
	} };
}
/**
* The steering rack on the body: its housing across the front with its rubber boots, the pinion at the driver's end,
* and the shaft with its universal joints up to the column.
* @param {Kit} kit @param {{ parent: THREE.Object3D, y: number, z: number, half: number, pinion: number, shaft: V3[], M: VehicleMats, assembly: string, source?: string }} o
*/
function steeringRack(kit, o) {
	const { M } = o, m = (g, mat) => kit.mesh(g, mat);
	const housing = GEO.merge([
		cyl([
			-o.half + .09,
			o.y,
			o.z
		], [
			o.half - .09,
			o.y,
			o.z
		], .024, 18),
		cyl([
			o.pinion,
			o.y - .03,
			o.z
		], [
			o.pinion,
			o.y + .07,
			o.z + .03
		], .03, 16),
		at(box(.06, .05, .05, .006), -o.half * .55, o.y + .03, o.z),
		at(box(.06, .05, .05, .006), o.half * .55, o.y + .03, o.z)
	]);
	const boots = [];
	for (const s of [-1, 1]) boots.push(GEO.lathe([
		[0, 0],
		[.026, 0],
		[.032, .02],
		[.022, .035],
		[.032, .05],
		[.022, .065],
		[.03, .08],
		[.014, .1],
		[0, .1]
	], 18).rotateZ(-s * Math.PI / 2).translate(s * (o.half - .1), o.y, o.z));
	const shaft = [hose(o.shaft, .01, 8)];
	for (const q of o.shaft.slice(1, -1)) shaft.push(at(box(.03, .03, .03, .006), q[0], q[1], q[2]));
	return kit.part(new three.Group().add(m(housing, M.zinc), m(GEO.merge(boots), M.boot), m(GEO.merge(shaft), M.forged)), {
		id: "steering-rack",
		label: "Steering rack",
		assembly: o.assembly,
		source: o.source,
		what: "A rack-and-pinion box across the front: the steering wheel’s shaft turns the pinion, the pinion slides the toothed rack sideways, the rack pushes and pulls the tie rods.",
		moves: "The rack slides as the wheel is turned (held straight here).",
		drive: "The steering wheel, through its shaft and universal joints",
		specs: [["Ratio", "20 : 1 [inferred]"], ["Turns, lock to lock", "3.8 [inferred]"]]
	}, { explode: [
		0,
		-.2,
		.2
	] }, o.parent);
}
/**
* @typedef {object} AxleOptions
* @property {THREE.Object3D} body the sprung frame the springs' hangers and the dampers' tops are on
* @property {number} z @property {number} y the axle's middle (in the root's frame; it stays on the wheels)
* @property {number} hub the hubs' faces at ±hub (m) @property {number} springX the leaf springs at ±springX
* @property {boolean} over the springs over the axle (else hung under it)
* @property {{ L: number, w: number, t: number, n: number, camber: number }} leaf the main leaf's length between its eyes, width, each leaf's thickness, how many, and its camber at the kerb's ride height
* @property {number} hanger the height of the frame's rails over the springs (in the body's frame), for their hangers
* @property {[V3, V3]} dampers each damper's top (in the body's frame); its bottom on the axle below it
* @property {number} ratio the final drive @property {number} rate each spring's rate (N/m)
* @property {VehicleMats} M @property {EngineMats} E @property {string} assembly @property {string} [springs] the springs', hangers' and dampers' assembly (else `assembly`) @property {string} [source]
* @property {import('$lib/assets/parts.js').How['tag']} [tag]
*/
/**
* A live rear axle on leaf springs: the banjo housing, the crown wheel and pinion in its bowl, the half-shafts in its
* tubes, the two leaf packs clamped to it by their U-bolts and hung from the frame on a hanger and a shackle, the two
* dampers. The axle stays on its wheels; the springs flatten and the dampers shorten as the body sinks onto it.
* @param {Kit} kit @param {AxleOptions} o
*/
function liveAxle(kit, o) {
	const { M, E } = o, m = (g, mat) => kit.mesh(g, mat);
	const { y, z, hub } = o, rt = .04;
	const bowl = latheZ([
		[0, -.1],
		[.11, -.1],
		[.135, -.07],
		[.145, -.01],
		[.13, .05],
		[.085, .1],
		[.055, .13],
		[.05, .2],
		[0, .2]
	], 40).translate(0, y, z);
	/** @type {THREE.BufferGeometry[]} */
	const tubes = [
		cyl([
			-hub + .11,
			y,
			z
		], [
			hub - .11,
			y,
			z
		], rt, 24),
		latheX([
			[.03, -hub + .09],
			[.09, -hub + .09],
			[.09, -hub + .105],
			[.03, -hub + .105]
		], 32).translate(0, y, z),
		latheX([
			[.03, hub - .105],
			[.09, hub - .105],
			[.09, hub - .09],
			[.03, hub - .09]
		], 32).translate(0, y, z)
	];
	const perchY = o.over ? y + rt + .008 : y - rt - .008;
	for (const s of [-1, 1]) tubes.push(at(box(o.leaf.w + .02, .016, .12, .003), s * o.springX, perchY, z));
	kit.part(new three.Group().add(m(GEO.merge([bowl, ...tubes]), M.chassis)), {
		id: "axle-housing",
		label: "Rear axle housing",
		assembly: o.assembly,
		source: o.source,
		what: "The banjo housing: a pressed-steel bowl round the differential with a tube out to each wheel, its spring seats welded on. It carries the vehicle’s rear and its load straight to the wheels.",
		specs: [["Type", "Live beam, semi-floating"]]
	}, {
		explode: [
			0,
			-.25,
			0
		],
		xray: "shell"
	});
	const crown = new three.Group(), pinion = new three.Group();
	{
		/** @type {number[]} */
		const angles = [];
		const T = 35;
		for (let k = 0; k < T; k++) angles.push(k / T * Math.PI * 2, (k + .42) / T * Math.PI * 2, (k + .5) / T * Math.PI * 2, (k + .92) / T * Math.PI * 2);
		const cw = revolveX([
			[.06, -.012],
			[.104, -.012],
			[
				.104,
				.002,
				1
			],
			[
				.072,
				.02,
				1
			],
			[.06, .02]
		], angles, (rr, _x, i, tag) => tag === 1 && i % 4 < 2 ? rr + .004 : rr);
		crown.add(m(GEO.merge([cw.translate(-.03, 0, 0), latheX([
			[0, -.05],
			[.055, -.05],
			[.06, 0],
			[.05, .05],
			[0, .05]
		], 28)]), E.gear));
		crown.position.set(0, y, z);
		/** @type {number[]} */
		const pa = [];
		const Tp = 11;
		for (let k = 0; k < Tp; k++) pa.push(k / Tp * Math.PI * 2, (k + .42) / Tp * Math.PI * 2, (k + .5) / Tp * Math.PI * 2, (k + .92) / Tp * Math.PI * 2);
		const pg = revolveX([
			[.012, 0],
			[
				.036,
				0,
				1
			],
			[
				.022,
				.045,
				1
			],
			[.012, .045]
		], pa, (rr, _x, i, tag) => tag === 1 && i % 4 < 2 ? rr + .004 : rr).rotateY(-Math.PI / 2);
		pinion.add(m(GEO.merge([
			pg,
			cyl([
				0,
				0,
				.04
			], [
				0,
				0,
				.2
			], .016, 12),
			latheZ([
				[.015, .2],
				[.048, .2],
				[.048, .212],
				[.015, .212]
			], 24)
		]), E.gear));
		pinion.position.set(0, y - .01, z + .065);
		const shafts = new three.Group();
		shafts.add(m(GEO.merge([cyl([
			-hub + .06,
			0,
			0
		], [
			-.05,
			0,
			0
		], .016, 12), cyl([
			.05,
			0,
			0
		], [
			hub - .06,
			0,
			0
		], .016, 12)]), E.crank));
		crown.add(shafts);
		const oil = m(at(box(.2, .08, .16, .02), 0, y - .085, z), E.oil);
		kit.part(new three.Group().add(crown, pinion, oil), {
			id: "differential",
			label: "Crown wheel, pinion and half-shafts",
			assembly: o.assembly,
			source: o.source,
			what: `The propshaft turns the pinion, the pinion turns the crown wheel ${o.ratio} times slower and a right angle round; the differential’s gears on the crown wheel share its torque between the half-shafts, letting the outer wheel turn faster in a bend.`,
			moves: "The pinion turns with the propshaft, the crown wheel and half-shafts with the wheels (shown slowed).",
			drive: "The propshaft",
			specs: [["Final drive", `${o.ratio.toFixed(2)} : 1 (35 : ${Math.round(35 / o.ratio)})`], ["Oil", "1.6 L, 80W-90 [inferred]"]]
		}, { explode: [
			0,
			-.5,
			.2
		] });
	}
	const leaf = leafPack(o.leaf);
	const eyeY = (c) => c + .012;
	/** the main leaf's middle: on the perch over the tube, or hung under it */
	const packY = o.over ? perchY + .008 + (o.leaf.n - 1) * o.leaf.t + o.leaf.t / 2 : perchY - .008 - o.leaf.t / 2;
	const packs = new three.Group();
	for (const s of [-1, 1]) {
		const g = new three.Group();
		g.position.set(s * o.springX, packY, z);
		g.add(m(leaf.geo, M.spring));
		const eyes = leaf.eyes.map((e) => {
			const c = new three.Group();
			c.add(m(leaf.eye, M.spring));
			return c;
		});
		g.add(...eyes);
		g.userData.eyes = eyes;
		packs.add(g);
		const yTop = o.over ? packY + o.leaf.t / 2 + .006 : y + rt + .004, yBot = o.over ? y - rt - .006 : packY - (o.leaf.n - 1) * o.leaf.t - o.leaf.t / 2 - .008;
		const ub = [];
		for (const dz of [-.045, .045]) for (const dx of [-1, 1]) ub.push(cyl([
			s * o.springX + dx * (o.leaf.w / 2 + .009),
			yBot - .02,
			z + dz
		], [
			s * o.springX + dx * (o.leaf.w / 2 + .009),
			yTop + .01,
			z + dz
		], .007, 8));
		for (const dz of [-.045, .045]) ub.push(at(box(o.leaf.w + .04, .012, .016, .003), s * o.springX, o.over ? yTop + .01 : yBot - .004, z + dz));
		ub.push(at(box(o.leaf.w + .04, .012, .12, .003), s * o.springX, o.over ? yBot - .006 : yBot - .004, z));
		packs.add(m(GEO.merge(ub), M.forged));
	}
	kit.part(packs, {
		id: "leaf-springs",
		label: "Leaf springs and U-bolts",
		count: 2,
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: `Two packs of ${o.leaf.n} steel leaves, each clamped to the axle by two U-bolts, its front eye on a hanger, its back eye on a swinging shackle: they carry the load and locate the axle. They flatten as the load grows.`,
		moves: "Flatten as the body sinks onto the axle, arch again as it lifts.",
		drive: "The load on the body",
		specs: [
			["Leaves", `${o.leaf.n} × ${Math.round(o.leaf.w * 1e3)} × ${Math.round(o.leaf.t * 1e3)} mm`],
			["Length", `${Math.round(o.leaf.L * 1e3)} mm between eyes`],
			["Rate", `${Math.round(o.rate / 1e3)} kN/m a side [inferred]`]
		]
	}, {
		explode: [
			0,
			-.4,
			0
		],
		tag: o.tag
	});
	const hang = [];
	const yEye = packY + eyeY(o.leaf.camber);
	for (const s of [-1, 1]) {
		const x = s * o.springX;
		hang.push(at(box(.012, o.hanger - yEye + .03, .07, .004), x - .035, (o.hanger + yEye) / 2, z + o.leaf.L / 2), at(box(.012, o.hanger - yEye + .03, .07, .004), x + .035, (o.hanger + yEye) / 2, z + o.leaf.L / 2), cyl([
			x - .045,
			yEye,
			z + o.leaf.L / 2
		], [
			x + .045,
			yEye,
			z + o.leaf.L / 2
		], .009, 10));
		const zs = z - o.leaf.L / 2;
		hang.push(at(box(.07, .05, .07, .006), x, o.hanger - .03, zs - .05), at(box(.01, .11, .035, .003), x - .035, yEye + .035, zs - .03), at(box(.01, .11, .035, .003), x + .035, yEye + .035, zs - .03), cyl([
			x - .045,
			yEye,
			zs
		], [
			x + .045,
			yEye,
			zs
		], .009, 10), cyl([
			x - .045,
			yEye + .07,
			zs - .05
		], [
			x + .045,
			yEye + .07,
			zs - .05
		], .009, 10));
	}
	kit.part(new three.Group().add(m(GEO.merge(hang), M.chassis)), {
		id: "spring-hangers",
		label: "Spring hangers and shackles",
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: "Under the frame: a fixed hanger for each spring’s front eye and a swinging shackle for its back eye, so the leaves can lengthen as they flatten.",
		specs: [["Bushes", "Rubber"]]
	}, { explode: [
		0,
		.1,
		0
	] }, o.body);
	const tl = [0, 1].map(() => telescope({
		body: .26,
		rod: .22,
		rBody: .026,
		M,
		mesh: kit.mesh
	}));
	kit.part(new three.Group().add(...tl.map((t) => t.group)), {
		id: "dampers-rear",
		label: "Rear dampers",
		count: 2,
		assembly: o.springs ?? o.assembly,
		source: o.source,
		what: "Telescopic dampers from the axle up to the frame, leaning in: oil forced through their valves turns the body’s bounce into heat.",
		moves: "Shorten as the body sinks, lengthen as it lifts.",
		specs: [["Type", "Twin tube [inferred]"]]
	}, { explode: [
		0,
		.25,
		-.15
	] });
	const bottoms = o.dampers.map((q) => [
		Math.sign(q[0]) * (o.springX - .11),
		y - .05,
		z - .07
	]);
	return {
		packs,
		/** sink the body onto it by `sag` (m), turn the wheels' side to `aw` and the pinion to `ap` @param {number} sag @param {number} aw @param {number} ap */
		update(sag, aw, ap) {
			leaf.set(o.leaf.camber - sag);
			for (const g of packs.children) {
				const eyes = g.userData.eyes;
				if (eyes) eyes.forEach((e, k) => e.position.copy(leaf.eyes[k].position));
			}
			crown.rotation.x = aw;
			pinion.rotation.z = -ap;
			tl.forEach((t, k) => t.set(bottoms[k], inFrame(o.body, o.dampers[k])));
		}
	};
}
/**
* The propshaft: one or two steel tubes with a universal joint at each end (and a centre bearing between two), re-aimed
* every moment from the gearbox (on the sprung body) to the axle's pinion (on the wheels), turning.
* @param {Kit} kit @param {{ n: 1 | 2, r: number, M: VehicleMats, assembly: string, source?: string, specs?: [string, string][], tag?: import('$lib/assets/parts.js').How['tag'] }} o
*/
function propshaft(kit, o) {
	const { M } = o, m = (g, mat) => kit.mesh(g, mat);
	const root = new three.Group();
	const yoke = GEO.merge([
		latheY([
			[.01, 0],
			[o.r + .004, 0],
			[o.r + .004, .03],
			[.01, .03]
		], 20),
		at(slab(.012, .045, .026), o.r * .7, -.02, 0),
		at(slab(.012, .045, .026), -o.r * .7, -.02, 0),
		cyl([
			-o.r * .75,
			-.035,
			0
		], [
			o.r * .75,
			-.035,
			0
		], .008, 8),
		cyl([
			0,
			-.035,
			-o.r * .75
		], [
			0,
			-.035,
			o.r * .75
		], .008, 8)
	]);
	const segs = Array.from({ length: o.n }, () => {
		const seg = new three.Group(), sp = new three.Group();
		const tube = m(new three.CylinderGeometry(o.r, o.r, 1, 20, 1).translate(0, .5, 0), M.chassis);
		const a = m(yoke.clone().rotateZ(Math.PI).translate(0, 0, 0), M.forged), b = m(yoke, M.forged);
		sp.add(tube, a, b);
		seg.add(sp);
		root.add(seg);
		return {
			seg,
			sp,
			tube,
			b
		};
	});
	const bearing = new three.Group();
	if (o.n === 2) bearing.add(m(GEO.merge([
		latheZ([
			[.02, -.02],
			[.05, -.02],
			[.05, .02],
			[.02, .02]
		], 24),
		at(box(.2, .015, .05, .004), 0, .05, 0),
		at(box(.015, .05, .04, .003), -.06, .03, 0),
		at(box(.015, .05, .04, .003), .06, .03, 0)
	]), M.bush));
	root.add(bearing);
	kit.part(root, {
		id: "propshaft",
		label: o.n === 2 ? "Propshaft (two pieces)" : "Propshaft",
		assembly: o.assembly,
		source: o.source,
		what: o.n === 2 ? "Two thin-walled steel tubes from the gearbox to the axle, joined over a rubber-mounted centre bearing under the floor, a universal joint at each end of each to follow the axle as it rises and falls." : "A thin-walled steel tube from the gearbox to the axle’s pinion, a universal joint at each end to follow the axle as it rises and falls.",
		moves: "Turns at the gearbox’s output speed (shown 40 times slower).",
		drive: "The gearbox",
		specs: o.specs ?? []
	}, {
		explode: [
			0,
			-.55,
			0
		],
		tag: o.tag
	});
	return { 
	/** run it through `pts` (gearbox, [centre bearing], pinion), turned to `a` @param {V3[]} pts @param {number} a */
set(pts, a) {
		segs.forEach((s, k) => {
			const L = aim(s.seg, pts[k], pts[k + 1]);
			s.tube.scale.y = Math.max(.01, L - .06);
			s.tube.position.y = .03;
			s.b.position.y = L;
			s.sp.rotation.y = a;
		});
		if (o.n === 2) bearing.position.set(...pts[1]);
	} };
}
/**
* A seat in its own frame (the floor under its cushion's middle at the origin, facing +z): the cushion, the backrest
* raked back with its bolsters, the headrest on its posts (if `head`), the base under it; a bench if it is wide.
* @param {{ w: number, d?: number, h?: number, back?: number, rake?: number, head?: boolean }} o
*/
function seatGeometry({ w, d = .5, h = .32, back = .62, rake = .24, head = true }) {
	/** @type {THREE.BufferGeometry[]} */
	const fabric = [box(w, .12, d, .045, 2).rotateX(-.06).translate(0, h - .06, 0)];
	const pivot = new three.Vector3(0, h - .02, -d / 2 + .07);
	/** @type {THREE.BufferGeometry[]} */
	const backG = [box(w, back, .11, .045, 2).translate(0, back / 2, 0)];
	const bench = w > .8;
	if (!bench) for (const s of [-1, 1]) backG.push(box(.07, back * .78, .14, .03, 2).translate(s * (w - .07) / 2, back * .42, .015));
	if (head) {
		const heads = bench ? [
			-w / 3,
			0,
			w / 3
		] : [0];
		for (const hx of heads) backG.push(box(.26, .16, .09, .04, 2).translate(hx, back + .13, 0));
	}
	const b = GEO.merge(backG).rotateX(-rake).translate(pivot.x, pivot.y, pivot.z);
	fabric.push(b);
	const posts = [];
	if (head) {
		const heads = bench ? [
			-w / 3,
			0,
			w / 3
		] : [0];
		for (const hx of heads) for (const s of [-1, 1]) posts.push(bar([
			hx + s * .07,
			back - .02,
			0
		], [
			hx + s * .07,
			back + .08,
			0
		], .006, 8).rotateX(-rake).translate(pivot.x, pivot.y, pivot.z));
	}
	/** @type {THREE.BufferGeometry[]} */
	const base = [
		box(w * .82, h - .12, d * .72, .01).translate(0, (h - .12) / 2, 0),
		slab(.03, .02, d * .9).translate(-w * .3, .01, 0),
		slab(.03, .02, d * .9).translate(w * .3, .01, 0)
	];
	return {
		fabric: GEO.merge(fabric),
		base: GEO.merge([...base, ...posts])
	};
}
/**
* A steering wheel in its own frame: its rim round the z axis, three spokes to the hub, the horn pad on the side
* facing −z (the driver); its column down along +z.
* @param {{ R?: number, column?: number }} [o]
*/
function steeringWheelGeometry({ R = .2, column = .5 } = {}) {
	const rim = new three.TorusGeometry(R, .016, 10, 56);
	const spokes = [];
	for (const a of [
		0,
		Math.PI,
		-Math.PI / 2
	]) spokes.push(bar([
		Math.cos(a) * .05,
		Math.sin(a) * .05,
		.02
	], [
		Math.cos(a) * (R - .01),
		Math.sin(a) * (R - .01),
		0
	], .012, 8));
	const hub = latheZ([
		[0, -.02],
		[.065, -.02],
		[.07, .01],
		[.05, .05],
		[0, .05]
	], 28);
	const col = GEO.merge([cyl([
		0,
		0,
		.05
	], [
		0,
		0,
		column
	], .022, 14), cyl([
		0,
		0,
		.06
	], [
		0,
		0,
		.2
	], .045, 18)]);
	return {
		rim: GEO.merge([rim, ...spokes]),
		hub,
		column: col
	};
}
/**
* An instrument cluster: round dials side by side in a binnacle, their faces towards −z (the driver), each needle
* swinging clockwise as the driver sees it, from lower left to lower right, as its value goes up.
* @param {Kit} kit @param {{ dials: { x: number, y: number, r: number, max: number, ticks?: number }[], face: THREE.Material, tick: THREE.Material, needle: THREE.Material, bezel: THREE.Material, housing: THREE.Material }} o
*/
function cluster(kit, o) {
	const g = new three.Group();
	const needles = o.dials.map((d) => {
		g.add(kit.mesh(new three.CircleGeometry(d.r, 40).rotateY(Math.PI).translate(d.x, d.y, 0), o.face));
		g.add(kit.mesh(new three.TorusGeometry(d.r + .004, .005, 6, 40).translate(d.x, d.y, 0), o.bezel));
		const ticks = [];
		const T = d.ticks ?? 9;
		for (let k = 0; k < T; k++) {
			const a = (225 - 270 * k / (T - 1)) * (Math.PI / 180);
			ticks.push(slab(.003, d.r * .18, .001).translate(0, d.r * .8, 0).rotateZ(a - Math.PI / 2).translate(d.x, d.y, -.002));
		}
		g.add(kit.mesh(GEO.merge(ticks), o.tick));
		const nd = new three.Group();
		nd.position.set(d.x, d.y, -.005);
		nd.add(kit.mesh(slab(.0035, d.r * .85, .002).translate(0, d.r * .35, 0), o.needle), kit.mesh(new three.CylinderGeometry(.008, .008, .006, 12).rotateX(Math.PI / 2), o.bezel));
		g.add(nd);
		return {
			nd,
			max: d.max
		};
	});
	const xs = o.dials.map((d) => d.x), rs = o.dials.map((d) => d.r);
	const w = Math.max(...xs) - Math.min(...xs) + 2 * Math.max(...rs) + .05;
	g.add(kit.mesh(at(box(w, 2 * Math.max(...rs) + .05, .05, .015), (Math.max(...xs) + Math.min(...xs)) / 2, o.dials[0].y, .026), o.housing));
	return {
		group: g,
		/** the needles to their values, in the dials' order @param {number[]} vs */
		set(vs) {
			needles.forEach((n, k) => n.nd.rotation.z = (-135 + clamp(vs[k] / n.max) * 270) * (Math.PI / 180));
		}
	};
}
/**
* A polygon's edges moved in by their own distances, its corners where the moved edges meet (anticlockwise: in is to
* the left).
* @param {V2[]} pts @param {number[]} d one per edge (edge i from point i to point i + 1)
* @returns {V2[]}
*/
function insetEdges(pts, d) {
	const n = pts.length;
	const lines = pts.map((p, i) => {
		const q = pts[(i + 1) % n];
		const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
		return {
			p: [p[0] - dy / L * d[i], p[1] + dx / L * d[i]],
			dir: [dx / L, dy / L]
		};
	});
	return pts.map((_, i) => {
		const a = lines[(i - 1 + n) % n], b = lines[i];
		const den = a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0];
		if (Math.abs(den) < 1e-6) return [b.p[0], b.p[1]];
		const s = ((b.p[0] - a.p[0]) * b.dir[1] - (b.p[1] - a.p[1]) * b.dir[0]) / den;
		return [a.p[0] + a.dir[0] * s, a.p[1] + a.dir[1] * s];
	});
}
/**
* One edge of a body's side profile as a panel across it, `W` wide: a sheet `t` thick whose outer face is on the profile, from
* x −hw to hw, with holes (in its own (x, s) plane, s along the edge from a), and its two rounded edges round onto
* the sides (quarter tubes of radius R).
* @param {V2} a @param {V2} b (z, y) @param {number} R @param {number} t @param {number} W @param {THREE.Path[]} [holes]
*/
function edgePanel(a, b, R, t, W, holes = []) {
	const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
	const S = new three.Vector3(0, dy / len, dz / len), N = new three.Vector3(0, -dz / len, dy / len), X = new three.Vector3(1, 0, 0);
	const hw = W / 2 - R;
	const s = new three.Shape();
	s.moveTo(-hw, 0);
	s.lineTo(hw, 0);
	s.lineTo(hw, len);
	s.lineTo(-hw, len);
	s.closePath();
	s.holes.push(...holes);
	const out = [plate(s, t, 8).translate(0, 0, -t / 2).applyMatrix4(new three.Matrix4().makeBasis(X, S, N)).translate(0, a[1], a[0])];
	const q = new three.Shape();
	q.absarc(0, 0, R, 0, Math.PI / 2, false);
	q.absarc(0, 0, R - t, Math.PI / 2, 0, true);
	q.closePath();
	for (const sx of [-1, 1]) {
		const P = new three.Vector3(sx, 0, 0), W = new three.Vector3().crossVectors(P, N);
		const strip = plate(q, len + R * .6, 6).applyMatrix4(new three.Matrix4().makeBasis(P, N, W));
		const mid = new three.Vector3(sx * hw, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2).addScaledVector(N, -R);
		out.push(strip.translate(mid.x, mid.y, mid.z));
	}
	return GEO.merge(out);
}
/** a shape for a side panel from (z, y) points, its corners rounded @param {V2[]} pts @param {number | number[]} r */
const zyShape = (pts, r) => roundPoly(zy(pts), r);
/** a hole in a side panel from (z, y) points @param {V2[]} pts @param {number | number[]} r */
const zyHole = (pts, r) => roundHole(zy(pts), r);
/** a (z, y) rectangle @param {number} z0 @param {number} z1 @param {number} y0 @param {number} y1 @returns {V2[]} */
const zyRect = (z0, z1, y0, y1) => [
	[z0, y0],
	[z1, y0],
	[z1, y1],
	[z0, y1]
];
/** a (z, y) rectangle grown by `d` all round @param {V2[]} r @param {number} d @returns {V2[]} */
function outsetRect(r, d) {
	const zs = r.map((p) => p[0]), ys = r.map((p) => p[1]);
	return zyRect(Math.min(...zs) - d, Math.max(...zs) + d, Math.min(...ys) - d, Math.max(...ys) + d);
}
/**
* A geometry drawn in an edge panel's own frame (x across, y along the edge from `a`, z out of its face) put on that
* edge of the profile, moved `out` out of its face.
* @param {THREE.BufferGeometry} g @param {V2} a @param {V2} b @param {number} out
*/
function onEdge(g, a, b, out) {
	const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
	const S = new three.Vector3(0, dy / len, dz / len), N = new three.Vector3(0, -dz / len, dy / len);
	return g.translate(0, 0, out).applyMatrix4(new three.Matrix4().makeBasis(new three.Vector3(1, 0, 0), S, N)).translate(0, a[1], a[0]);
}
/** the part of a polygon below (or above) a height, (z, y) @param {V2[]} pts @param {number} y0 @param {boolean} below @returns {V2[]} */
function clipY(pts, y0, below) {
	const inside = (p) => below ? p[1] <= y0 : p[1] >= y0;
	/** @type {V2[]} */
	const out = [];
	for (let i = 0; i < pts.length; i++) {
		const a = pts[i], b = pts[(i + 1) % pts.length];
		if (inside(a)) out.push(a);
		if (inside(a) !== inside(b)) {
			const k = (y0 - a[1]) / (b[1] - a[1]);
			out.push([a[0] + (b[0] - a[0]) * k, y0]);
		}
	}
	return out;
}
/**
* A hinged or sliding door's panels from its opening in the side and its window, (z, y): its lower half a solid skin
* (`t[0]` thick, the window wound down into it), its frame round the glass above `split` (`t[1]` thick), the glass in
* the frame, the trim card inside the lower half; the outer face on the side at x = sx · x.
* @param {V2[]} hole @param {V2[]} win @param {{ x: number, sx: number, split: number, t?: [number, number], gap?: number }} o
*/
function doorPanels(hole, win, { x, sx, split, t = [.055, .03], gap = .004 }) {
	const O = insetEdges(hole, hole.map(() => gap));
	const low = zyShape(clipY(O, split, true), .02);
	const up = zyShape(clipY(O, split, false), .02);
	up.holes.push(zyHole(win, .04));
	const lowIn = clipY(O, split - .04, true);
	return {
		skin: GEO.merge([onX(plate(low, t[0], 6), sx * (x - t[0] / 2)), onX(plate(up, t[1], 6), sx * (x - t[1] / 2))]),
		glass: onX(plate(zyShape(win, .04), .005, 6), sx * (x - t[1] / 2)),
		card: onX(plate(zyShape(insetEdges(lowIn, lowIn.map(() => .03)), .03), .008, 4), sx * (x - t[0] - .004))
	};
}

//#endregion
//#region src/lib/machines/van.js
/** @typedef {[number, number, number]} V3 */
/** @typedef {[number, number]} V2 */
/** the van's measures (m): its body's width, its ends, the axles, its floor, waist and roof */
const VAN = {
	W: 1.9,
	front: 2.5,
	rear: -2.45,
	axle: {
		front: 1.6,
		rear: -1.55,
		x: .82
	},
	floor: .62,
	sill: .42,
	waist: 1.3,
	roof: 2.13,
	/** the driver's seat (x, z) and the steering wheel's hub */
	driver: {
		x: -.56,
		z: 1.02
	},
	wheel: [
		-.56,
		1.42,
		1.44
	],
	/** the sliding door's opening and the front doors' (z, y) */
	slider: {
		z0: .22,
		z1: 1.24,
		y0: .5,
		y1: 2
	},
	fdoor: {
		z0: 1.3,
		hinge: 2.14,
		y0: .8,
		y1: 2
	}
};
const TYRE = /* @__PURE__ */ (() => tyreSize(185, 80, 14))();
const SOURCES = [
	{
		label: "Road load and rolling resistance (Wong, Theory of Ground Vehicles)",
		url: "https://en.wikipedia.org/wiki/Rolling_resistance"
	},
	{
		label: "Drag of road vehicles (Hucho)",
		url: "https://en.wikipedia.org/wiki/Automobile_drag_coefficient"
	},
	{
		label: "Engine friction and fuel (Heywood, IC Engine Fundamentals)",
		url: "https://en.wikipedia.org/wiki/Brake-specific_fuel_consumption"
	},
	{
		label: "Tyre markings (ETRTO)",
		url: "https://en.wikipedia.org/wiki/Tire_code"
	},
	{
		label: "Leaf and coil suspension",
		url: "https://en.wikipedia.org/wiki/Leaf_spring"
	},
	{
		label: "Machine skill kit (AirSup, MIT)",
		url: "https://github.com/AirsupHQ/machine-skill"
	}
];
const SRC = /* @__PURE__ */ (() => ({
	road: SOURCES[0].label,
	air: SOURCES[1].label,
	eng: SOURCES[2].label,
	tyre: SOURCES[3].label,
	susp: SOURCES[4].label
}))();
const ASSEMBLIES = [
	{
		id: "chassis",
		label: "Chassis and suspension",
		note: "The ladder frame the body sits on; double wishbones and coil springs in front with the rack-and-pinion, a live axle on leaf springs behind.",
		out: [
			0,
			-.7,
			0
		]
	},
	{
		id: "wheels",
		label: "Wheels and brakes",
		note: "Four 185/80 R14 C tyres on steel wheels; vented discs and callipers in front, drums behind.",
		out: [
			.5,
			-.2,
			0
		]
	},
	{
		id: "engine",
		label: "Engine",
		note: "A 2.4 L four-cylinder diesel under the cover between the front seats, 55 kW and 152 N·m.",
		out: [
			0,
			.1,
			0
		]
	},
	{
		id: "drivetrain",
		label: "Gearbox and drive",
		note: "The clutch, the 5-speed gearbox, the two-piece propshaft and the rear axle’s crown wheel and pinion.",
		out: [
			0,
			-.4,
			-.3
		]
	},
	{
		id: "services",
		label: "Cooling, fuel and power",
		note: "The radiator and its fan in the nose, the battery and the air filter beside it, the fuel tank under the floor, the exhaust.",
		out: [
			0,
			-.35,
			.2
		]
	},
	{
		id: "body",
		label: "Body",
		note: "The steel body in two tones on the frame: its sides, nose, roof and back, the floor, the glass.",
		out: [
			0,
			1,
			0
		]
	},
	{
		id: "doors",
		label: "Doors",
		note: "The sliding door on the left and the two front doors, each on its rails or hinges.",
		out: [
			.6,
			.4,
			0
		]
	},
	{
		id: "cab",
		label: "Cab and seats",
		note: "The dashboard and its gauges, the steering wheel and pedals, the engine’s cover, eleven seats in three rows.",
		out: [
			0,
			.6,
			0
		]
	},
	{
		id: "roof",
		label: "Roof rack and load",
		note: "The rack on the roof’s gutters and what is tied on it: three bags, a sack of rice and a spare tyre.",
		out: [
			0,
			1.6,
			0
		]
	}
];
const STEPS = [
	"Weld the frame and hang the suspension, the axle and the steering on it",
	"Bolt on the wheels and brakes",
	"Drop in the engine on its mounts",
	"Bolt on the gearbox; fit the propshaft and the axle’s gears",
	"Fit the radiator, battery, fuel tank and exhaust",
	"Lower the body onto the frame; fit the glass",
	"Hang the doors",
	"Fit the dashboard, the steering wheel, the seats",
	"Bolt on the roof rack and tie the load on"
];
/** the van's paint and trim (linear colours, measured where AirSup has them) */
function materials() {
	const tones = new three.DataTexture(new Uint8Array([
		194,
		175,
		133,
		255,
		29,
		65,
		97,
		255
	]), 1, 2, three.RGBAFormat);
	tones.magFilter = tones.minFilter = three.NearestFilter;
	tones.wrapS = tones.wrapT = three.ClampToEdgeWrapping;
	tones.channel = 1;
	tones.needsUpdate = true;
	const paint = MAT.paint({
		color: [
			1,
			1,
			1
		],
		roughness: .5,
		clearcoat: .12,
		clearcoatRoughness: .5
	});
	paint.map = tones;
	return {
		paint,
		blue: MAT.paint({
			color: [
				.114,
				.254,
				.381
			],
			roughness: .5,
			clearcoat: .12,
			clearcoatRoughness: .5
		}),
		cream: MAT.paint({
			color: [
				.76,
				.686,
				.521
			],
			roughness: .52,
			clearcoat: .1,
			clearcoatRoughness: .5
		}),
		rust: MAT.paint({
			color: [
				.254,
				.069,
				.019
			],
			roughness: .95,
			clearcoat: 0,
			finish: "cast"
		}),
		trim: MAT.satin({
			color: [
				.03,
				.03,
				.032
			],
			roughness: .6
		}),
		rubber: MAT.rubber({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .7
		}),
		chrome: MAT.chrome({ roughness: .12 }),
		glass: MAT.glass({
			color: [
				.86,
				.93,
				.95
			],
			roughness: .04
		}),
		lens: MAT.glass({
			color: [
				.95,
				.95,
				.92
			],
			roughness: .08,
			thickness: .01
		}),
		red: MAT.plastic({
			color: [
				.45,
				.02,
				.015
			],
			roughness: .25,
			transmission: .4,
			thickness: .01
		}),
		amber: MAT.plastic({
			color: [
				.8,
				.32,
				.02
			],
			roughness: .25,
			transmission: .4,
			thickness: .01
		}),
		reflector: MAT.chrome({ roughness: .2 }),
		plate: MAT.paint({
			color: [
				.85,
				.85,
				.82
			],
			roughness: .4
		}),
		floor: MAT.rubber({
			color: [
				.03,
				.03,
				.033
			],
			roughness: .85
		}),
		fabric: MAT.satin({
			color: [
				.2,
				.09,
				.045
			],
			roughness: .95,
			finish: "cast"
		}),
		fabricDark: MAT.satin({
			color: [
				.06,
				.04,
				.03
			],
			roughness: .95,
			finish: "cast"
		}),
		vinyl: MAT.plastic({
			color: [
				.035,
				.035,
				.038
			],
			roughness: .62
		}),
		dash: MAT.plastic({
			color: [
				.05,
				.048,
				.045
			],
			roughness: .7
		}),
		card: MAT.plastic({
			color: [
				.32,
				.29,
				.25
			],
			roughness: .85
		}),
		dial: MAT.satin({
			color: [
				.015,
				.015,
				.018
			],
			roughness: .4
		}),
		white: MAT.plastic({
			color: [
				.85,
				.85,
				.82
			],
			roughness: .4
		}),
		needle: MAT.plastic({
			color: [
				.85,
				.22,
				.02
			],
			roughness: .3
		}),
		rack: MAT.paint({
			color: [
				.043,
				.043,
				.045
			],
			roughness: .55,
			clearcoat: .2,
			metalness: .4
		}),
		bagRed: MAT.satin({
			color: [
				.33,
				.043,
				.028
			],
			roughness: .92,
			finish: "cast"
		}),
		bagGreen: MAT.satin({
			color: [
				.078,
				.147,
				.043
			],
			roughness: .92,
			finish: "cast"
		}),
		bagBlue: MAT.satin({
			color: [
				.028,
				.078,
				.195
			],
			roughness: .92,
			finish: "cast"
		}),
		sack: MAT.satin({
			color: [
				.686,
				.604,
				.402
			],
			roughness: .98,
			finish: "cast"
		}),
		strap: MAT.satin({
			color: [
				.6,
				.45,
				.04
			],
			roughness: .8
		}),
		tank: MAT.paint({
			color: [
				.05,
				.05,
				.055
			],
			roughness: .6
		}),
		battery: MAT.plastic({
			color: [
				.02,
				.02,
				.022
			],
			roughness: .5
		}),
		lead: MAT.steel({
			color: [
				.42,
				.42,
				.44
			],
			roughness: .5,
			finish: "cast"
		}),
		core: MAT.aluminium({
			color: [
				.55,
				.56,
				.57
			],
			roughness: .6
		}),
		silencer: MAT.steelDark({
			color: [
				.2,
				.17,
				.15
			],
			roughness: .7
		}),
		filterBox: MAT.plastic({
			color: [
				.03,
				.03,
				.035
			],
			roughness: .55
		})
	};
}
/**
* The side profile of the body, (z, y) anticlockwise from its rear bottom: the sill with the two wheel arches cut up
* into it, the nose, the bonnet, the windscreen, the roof, the back. Each edge's radius: how far its panel's rounded
* edge reaches round onto the side (0 along the sill and arches).
* @returns {{ pts: V2[], r: number[], seg: boolean[] }}
*/
function profile() {
	const { axle, sill, front, rear, roof } = VAN;
	const yw = TYRE.r - .008, Ra = .43;
	/** @type {V2[]} */
	const pts = [[rear, sill]];
	/** @type {number[]} */
	const r = [];
	/** @type {boolean[]} */
	const seg = [];
	const arch = (zc) => {
		const a0 = Math.PI - Math.asin((sill - yw) / Ra), a1 = Math.asin((sill - yw) / Ra);
		for (let k = 0; k <= 14; k++) {
			const a = a0 + (a1 - a0) * k / 14;
			pts.push([zc + Ra * Math.cos(a), yw + Ra * Math.sin(a)]);
		}
	};
	arch(axle.rear);
	arch(axle.front);
	/** the front, the roof and the back, each point the start of an edge with its radius */
	const ends = [
		[front - .04, sill],
		[front, .95],
		[front - .01, 1.42],
		[front - .07, 1.49],
		[2.2, 1.53],
		[1.98, 2.05],
		[1.88, roof],
		[rear + .07, roof],
		[rear, roof - .07]
	];
	const er = [
		.1,
		.1,
		.1,
		.1,
		.08,
		.09,
		.09,
		.07,
		.07
	];
	const k0 = pts.length;
	pts.push(...ends);
	for (let k = 0; k < pts.length; k++) {
		r.push(k < k0 ? 0 : er[k - k0]);
		seg.push(k >= k0);
	}
	return {
		pts,
		r,
		seg
	};
}
/** give a body panel's vertices their second uvs from their height, so the two-tone paint changes at the waist @param {THREE.BufferGeometry} g @param {number} [dy] its height's offset from the body's frame */
function tone(g, dy = 0) {
	const p = g.attributes.position, uv = new Float32Array(p.count * 2);
	for (let i = 0; i < p.count; i++) {
		uv[i * 2] = .5;
		uv[i * 2 + 1] = .5 + (p.getY(i) + dy - VAN.waist) * 200;
	}
	g.setAttribute("uv1", new three.BufferAttribute(uv, 2));
	return g;
}
/** the van as the solver runs it [inferred where marked in the research] */
const VEHICLE = /* @__PURE__ */ (() => ({
	kerb: 1950,
	payload: 1e3,
	Crr: .011,
	CdA: 1.62,
	r: TYRE.r * .97,
	eta: .9,
	gears: [
		4,
		2.2,
		1.4,
		1,
		.8
	],
	final: 4.3,
	engine: {
		rpm: [
			700,
			1e3,
			1500,
			2e3,
			2400,
			3e3,
			3600,
			4e3,
			4400
		],
		nm: [
			75,
			108,
			136,
			148,
			152,
			147,
			139,
			131,
			70
		],
		idle: 780,
		stall: 560,
		max: 4400,
		up: 3600,
		down: 1350,
		launch: 1250,
		Vd: .00239,
		fmep: 16e4,
		bsfc: 200,
		fuel: "diesel",
		J: .28
	},
	Jw: 1,
	wheels: 4,
	axles: {
		wb: VAN.axle.front - VAN.axle.rear,
		h: .85,
		front: .5,
		loadFront: .35,
		k: [32e3, 52e3],
		travel: [.08, .1]
	}
}))();
const KMH = 1 / 3.6;
/**
* The travel van: a root at its real size, every part its own, its solver driving it.
* @param {{ speed?: number, grade?: number, load?: number, doors?: number }} [o] the speed asked (km/h), the grade (%),
*   the load in it (kg, people and bags), how far its doors are open (0 shut … 1 open)
* @returns {THREE.Group}
*/
function van({ speed = 80, grade = 0, load = 600, doors = 0 } = {}) {
	const root = new three.Group();
	root.name = "Travel van";
	const M = materials(), R = vehicleMaterials(), E = engineMaterials();
	const kit = assetKit(root, {
		assemblies: ASSEMBLIES,
		steps: STEPS,
		sources: SOURCES
	});
	const m = (geo, mat) => kit.mesh(geo, mat);
	/** the sprung body: everything the springs carry, sinking and pitching on them */
	const body = new three.Group();
	body.name = "sprung";
	root.add(body);
	/** a part: its meshes, its card and how it is shown (in the body unless said) */
	const part = (info, objs, how = {}, parent = body) => {
		const grp = new three.Group();
		grp.add(...objs);
		return kit.part(grp, info, how, parent);
	};
	const { W, axle, floor } = VAN, X = W / 2;
	const yw = TYRE.r - .008;
	const sim = vehicleSolver(VEHICLE);
	const kmh = () => sim.s.v * 3.6;
	const rails = [[2.38, .54], [-2.3, .54]];
	{
		const g = [ladderFrame({
			x: .45,
			w: .06,
			h: .12,
			t: .004,
			path: rails,
			cross: [
				2.3,
				-.45,
				-1.02,
				-2.22
			]
		})];
		g.push(at(box(.9, .07, .1, .01), 0, .3, axle.front), at(box(.05, .06, .42, .008), .3, .27, axle.front), at(box(.05, .06, .42, .008), -.3, .27, axle.front));
		for (const sx of [-1, 1]) g.push(at(box(.06, .18, .08, .006), sx * .43, .39, axle.front), at(box(.08, .02, .14, .004), sx * .53, .595, axle.front), at(box(.04, .12, .05, .004), sx * .5, .53, axle.front + .15), at(box(.04, .12, .05, .004), sx * .5, .53, axle.front - .15));
		g.push(at(box(.9, .05, .08, .008), 0, .345, .46), at(box(.05, .14, .06, .006), .42, .42, .46), at(box(.05, .14, .06, .006), -.42, .42, .46));
		for (const sx of [-1, 1]) g.push(at(box(.08, .012, .1, .003), sx * .375, .494, 1.27), at(box(.012, .05, .1, .003), sx * .418, .52, 1.27));
		for (const sx of [-1, 1]) g.push(at(box(.08, .04, .06, .006), sx * .39, .575, -1.3));
		for (const sx of [-1, 1]) g.push(at(box(.06, .05, .06, .012), sx * .45, .455, axle.rear));
		part({
			id: "frame",
			label: "Ladder frame",
			assembly: "chassis",
			source: SRC.susp,
			what: "Two box-section steel rails the length of the van, joined by crossmembers: everything hangs from it, and the body sits on it on rubber mounts. A dropped crossmember carries the front suspension under the engine’s nose, another the gearbox’s tail.",
			specs: [["Rails", "120 × 60 × 4 mm box [inferred]"], ["Track of rails", "900 mm"]]
		}, [m(GEO.merge(g), R.chassis)], { explode: [
			0,
			-.6,
			0
		] });
	}
	const tagWheel = (which) => ({
		text: `Wheel, ${which}`,
		at: [
			.12,
			.2,
			0
		],
		side: "left",
		value: () => which.startsWith("front") ? `${fmt(sim.s.v / VEHICLE.r * 9.549)} rpm · ${fmt(sim.s.loadF / G)} kg on it` : `${fmt(sim.s.v / VEHICLE.r * 9.549)} rpm · ${fmt(sim.s.loadR / G)} kg on it`
	});
	const wheelOpts = {
		size: TYRE,
		rimW: .1397,
		et: .03,
		rim: "steel",
		studs: 5,
		pcd: .13,
		M: R,
		assembly: "wheels",
		source: SRC.tyre,
		capMat: M.chrome
	};
	const corners = {
		fl: wheelCorner(kit, {
			...wheelOpts,
			id: "fl",
			label: "front left",
			at: [
				axle.x,
				yw,
				axle.front
			],
			side: 1,
			brake: "disc",
			disc: {
				r: .128,
				rIn: .08,
				t: .022
			},
			steers: true,
			arm: 1,
			drive: "The road; steered by the knuckle",
			tag: tagWheel("front left")
		}),
		fr: wheelCorner(kit, {
			...wheelOpts,
			id: "fr",
			label: "front right",
			at: [
				-axle.x,
				yw,
				axle.front
			],
			side: -1,
			brake: "disc",
			disc: {
				r: .128,
				rIn: .08,
				t: .022
			},
			steers: true,
			arm: 1
		}),
		rl: wheelCorner(kit, {
			...wheelOpts,
			id: "rl",
			label: "rear left",
			at: [
				axle.x,
				yw,
				axle.rear
			],
			side: 1,
			brake: "drum",
			drum: {
				r: .127,
				depth: .075
			},
			drive: "The half-shaft, from the differential",
			tag: tagWheel("rear left")
		}),
		rr: wheelCorner(kit, {
			...wheelOpts,
			id: "rr",
			label: "rear right",
			at: [
				-axle.x,
				yw,
				axle.rear
			],
			side: -1,
			brake: "drum",
			drum: {
				r: .127,
				depth: .075
			},
			drive: "The half-shaft, from the differential"
		})
	};
	const front = ["fl", "fr"].map((id) => {
		const sx = id === "fl" ? 1 : -1;
		return doubleWishbone(kit, {
			id,
			label: id === "fl" ? "front left" : "front right",
			corner: corners[id],
			body,
			upper: [[
				sx * .5,
				.53,
				axle.front + .15
			], [
				sx * .5,
				.53,
				axle.front - .15
			]],
			lower: [[
				sx * .3,
				.22,
				axle.front + .18
			], [
				sx * .3,
				.22,
				axle.front - .18
			]],
			top: [
				sx * .53,
				.585,
				axle.front
			],
			rack: [
				sx * .36,
				.33,
				axle.front + .24
			],
			coil: {
				R: .052,
				wire: .0105,
				turns: 5,
				k: VEHICLE.axles.k[0]
			},
			M: R,
			assembly: "chassis",
			source: SRC.susp,
			tag: id === "fl" ? {
				text: "Front spring",
				at: [
					0,
					.3,
					0
				],
				side: "left",
				value: () => `sunk ${fmt(sim.s.sagF * 1e3)} mm${sim.s.sagF > VEHICLE.axles.travel[0] ? " · on its bump stop" : ""}`
			} : void 0
		});
	});
	steeringRack(kit, {
		parent: body,
		y: .33,
		z: axle.front + .24,
		half: .45,
		pinion: -.3,
		shaft: [
			[
				-.3,
				.38,
				axle.front + .25
			],
			[
				-.42,
				.66,
				axle.front + .2
			],
			[
				-.56,
				1,
				1.72
			]
		],
		M: R,
		assembly: "chassis",
		source: SRC.susp
	});
	const rearAxle = liveAxle(kit, {
		body,
		z: axle.rear,
		y: yw,
		hub: axle.x - .02,
		springX: .45,
		over: false,
		leaf: {
			L: 1.2,
			w: .06,
			t: .008,
			n: 5,
			camber: .075
		},
		hanger: .48,
		dampers: [[
			.39,
			.575,
			-1.3
		], [
			-.39,
			.575,
			-1.3
		]],
		ratio: VEHICLE.final,
		rate: VEHICLE.axles.k[1],
		M: R,
		E,
		assembly: "drivetrain",
		springs: "chassis",
		source: SRC.susp,
		tag: {
			text: "Rear springs",
			at: [
				.45,
				.33,
				-1.5
			],
			side: "left",
			value: () => `sunk ${fmt(sim.s.sagR * 1e3)} mm${sim.s.sagR > VEHICLE.axles.travel[1] ? " · on the bump stops" : ""}`
		}
	});
	const engine = inlineEngine(kit, {
		parent: body,
		at: [
			0,
			.52,
			1.25
		],
		bore: .092,
		stroke: .09,
		rod: .152,
		pitch: .104,
		well: "rear",
		gears: VEHICLE.gears,
		lever: [
			0,
			.6,
			-.42
		],
		mounts: [[
			.375,
			-.02,
			.02
		], [
			-.375,
			-.02,
			.02
		]],
		rearMount: [
			0,
			-.15,
			-.79
		],
		assembly: "engine",
		gearAssembly: "drivetrain",
		source: SRC.eng,
		name: "2.4 L diesel",
		specs: [
			["Power", "55 kW at 4,000 rpm [inferred]"],
			["Torque", "152 N·m at 2,400 rpm [inferred]"],
			["Injection", "Indirect, 22 : 1"],
			["Friction", "1.6 bar mean pressure at 2,000 rpm [inferred]"]
		],
		M: E,
		tag: () => sim.s.stalled ? "stalled" : `${fmt(sim.s.rpm)} rpm · ${fmt(Math.max(0, sim.s.Te))} N·m · ${fmt(Math.max(0, sim.s.Pe) / 1e3, 1)} kW`,
		gearTag: () => sim.s.stalled ? "stalled in 1st" : sim.s.v < .05 && sim.s.at.vSet < .05 ? "neutral" : `${ordinal(sim.s.gear)} gear · ${VEHICLE.gears[sim.s.gear - 1].toFixed(2)} : 1${sim.s.launch ? " · clutch slipping" : ""}`
	});
	const shaft = propshaft(kit, {
		n: 2,
		r: .032,
		M: R,
		assembly: "drivetrain",
		source: SRC.eng,
		specs: [["Tube", "Ø 64 × 1.6 mm steel [inferred]"], ["Joints", "4 universal joints, a centre bearing"]]
	});
	const BEARING = [
		0,
		.44,
		-.45
	];
	const PINION = [
		0,
		yw - .01,
		axle.rear + .065 + .212
	];
	const fan = new three.Group();
	{
		const zr = 2.37, yr = 1.02, wr = .62, hr = .44;
		const fins = [];
		for (let k = 0; k <= 56; k++) fins.push(slab(6e-4, hr, .036).translate(-.62 / 2 + k * wr / 56, yr, zr));
		const core = GEO.merge([at(box(wr, hr, .03, .002), 0, yr, zr), ...fins]);
		const tanks = GEO.merge([
			at(box(.6799999999999999, .06, .06, .012), 0, 1.27, zr),
			at(box(.6799999999999999, .06, .06, .012), 0, yr - hr / 2 - .03, zr),
			cyl([
				.2,
				1.3,
				zr
			], [
				.2,
				1.32,
				zr
			], .022, 20)
		]);
		const shroud = new three.Shape();
		shroud.absarc(0, 0, .2, 0, Math.PI * 2, false);
		shroud.holes.push(circle(0, 0, .185));
		fan.add(m(GEO.rotor({
			count: 5,
			axis: "z",
			r0: .04,
			r1: .175,
			chord: [.05, .07],
			thick: .06,
			camber: .08,
			twist: .35,
			pitch: .45,
			nS: 5,
			nC: 7
		}), E.plastic));
		fan.position.set(0, yr, 2.3000000000000003);
		const motor = GEO.merge([
			cyl([
				0,
				yr,
				2.2600000000000002
			], [
				0,
				yr,
				2.3000000000000003
			], .045, 20),
			plate(shroud, .05, 24).translate(0, yr, 2.31),
			at(slab(.4, .02, .012), 0, yr, 2.265),
			at(slab(.02, .4, .012), 0, yr, 2.265)
		]);
		const hoses = [hose([
			[
				.24,
				1.27,
				2.3400000000000003
			],
			[
				.22,
				1.12,
				2.14
			],
			[
				.08,
				.95,
				1.72
			],
			[
				0,
				.85,
				1.5
			]
		], .019, 8), hose([
			[
				-.24,
				yr - hr / 2 - .03,
				2.3400000000000003
			],
			[
				-.22,
				.72,
				2.12
			],
			[
				-.08,
				.68,
				1.68
			],
			[
				-.03,
				.66,
				1.53
			]
		], .019, 8)];
		part({
			id: "radiator",
			label: "Radiator and fan",
			assembly: "services",
			source: SRC.eng,
			what: "In the nose behind the grille: the engine’s coolant runs down through the radiator’s finned tubes and gives its heat to the air the road and the electric fan push through it; two long hoses run back under the floor to the engine.",
			moves: "The fan turns when the coolant is hot.",
			drive: "Its 12 V motor, switched by a thermostat",
			specs: [["Core", `${Math.round(wr * 1e3)} × ${Math.round(hr * 1e3)} mm, aluminium [inferred]`], ["Rejects", "About a third of the fuel’s heat at full load"]]
		}, [
			m(core, M.core),
			m(tanks, E.plastic),
			m(motor, E.plastic),
			fan,
			m(GEO.merge(hoses), E.hose)
		], {
			explode: [
				0,
				.2,
				.9
			],
			tag: {
				text: "Radiator",
				at: [
					.32,
					1.27,
					zr
				],
				side: "right",
				value: () => `${fmt(heat(), 1)} kW to the air`
			}
		});
		const bt = {
			x: -.58,
			y: .885,
			z: 2.3,
			w: .24,
			h: .19,
			d: .17
		};
		part({
			id: "battery",
			label: "12 V battery",
			assembly: "services",
			source: SRC.eng,
			what: "The starting battery in the nose, beside the radiator: it cranks the engine and heats the glow plugs; the alternator charges it.",
			specs: [["Capacity", "88 Ah, 680 A cold cranking [inferred]"]]
		}, [
			m(at(box(bt.w, bt.h, bt.d, .008), bt.x, bt.y + bt.h / 2, bt.z), M.battery),
			m(GEO.merge([cyl([
				bt.x - .08,
				bt.y + bt.h,
				bt.z
			], [
				bt.x - .08,
				bt.y + bt.h + .02,
				bt.z
			], .009, 12), cyl([
				bt.x + .08,
				bt.y + bt.h,
				bt.z
			], [
				bt.x + .08,
				bt.y + bt.h + .02,
				bt.z
			], .009, 12)]), M.lead),
			m(GEO.merge([at(box(bt.w + .04, .012, bt.d + .04, .004), bt.x, bt.y - .006, bt.z), hose([
				[
					bt.x + .08,
					bt.y + bt.h + .02,
					bt.z
				],
				[
					bt.x + .2,
					bt.y + .1,
					bt.z - .1
				],
				[
					-.2,
					.6,
					1.9
				],
				[
					-.155,
					.45,
					1.05
				]
			], .007, 8)]), M.trim)
		], { explode: [
			-.3,
			.3,
			.5
		] });
		const af = GEO.merge([at(box(.28, .16, .22, .02), .58, 1.06, 2.3), cyl([
			.58,
			1.06,
			2.41
		], [
			.58,
			1.06,
			2.46
		], .04, 20)]);
		part({
			id: "air-filter",
			label: "Air filter and intake",
			assembly: "services",
			source: SRC.eng,
			what: "The engine breathes through a paper element in this box behind the grille, then down a long duct to the intake manifold.",
			specs: [["Element", "Paper, dry [inferred]"]]
		}, [m(af, M.filterBox), m(hose([
			[
				.5,
				1,
				2.19
			],
			[
				.38,
				.95,
				1.95
			],
			[
				.22,
				.9,
				1.62
			],
			[
				.26,
				.88,
				1.25
			],
			[
				.176,
				.858,
				1.06
			]
		], .032, 12), E.hose)], { explode: [
			.3,
			.3,
			.5
		] });
		const ft = {
			x: -.71,
			y: .46,
			z: -.6,
			w: .32,
			h: .24,
			d: .7
		};
		const tankG = GEO.merge([
			at(box(ft.w, ft.h, ft.d, .03), ft.x, ft.y, ft.z),
			at(box(ft.w + .01, .01, .02, .003), ft.x, ft.y + ft.h / 2 - .02, ft.z + .2),
			at(box(ft.w + .01, .01, .02, .003), ft.x, ft.y + ft.h / 2 - .02, ft.z - .2)
		]);
		part({
			id: "fuel-tank",
			label: "Fuel tank",
			assembly: "services",
			source: SRC.eng,
			what: "A 60 L pressed-steel tank under the floor on the right, hung on two straps; its filler neck runs up to the cap on the side.",
			specs: [["Volume", "60 L [inferred]"], ["Fuel", "Diesel, 835 g/L"]]
		}, [m(tankG, M.tank), m(GEO.merge([hose([
			[
				ft.x - .1,
				ft.y + ft.h / 2,
				ft.z - .3
			],
			[
				-.88,
				.75,
				-.95
			],
			[
				-.93,
				1,
				-.95
			]
		], .022, 10), hose([
			[
				ft.x + .14,
				ft.y + .08,
				ft.z + .35
			],
			[
				-.38,
				.5,
				.2
			],
			[
				-.1,
				.45,
				.9
			],
			[
				.12,
				.55,
				1.3
			],
			[
				.16,
				.66,
				1.42
			]
		], .005, 6)]), E.hose)], {
			explode: [
				-.5,
				-.3,
				0
			],
			tag: {
				text: "Fuel",
				at: [
					ft.x - ft.w / 2,
					ft.y,
					ft.z
				],
				side: "right",
				value: () => sim.s.stalled ? "stopped" : `${fmt(sim.s.fuel, 1)} L/h${sim.s.v > .5 ? ` · ${fmt(sim.s.l100, 1)} L/100 km` : ""}`
			}
		});
		const ex = engine.points.exhaust;
		const pipe = hose([
			ex,
			[
				ex[0] - .04,
				.55,
				ex[2] - .08
			],
			[
				-.25,
				.42,
				.82
			],
			[
				-.25,
				.42,
				.2
			]
		], .024, 12);
		const tail = hose([
			[
				-.25,
				.42,
				-.78
			],
			[
				-.27,
				.43,
				-1.3
			],
			[
				-.29,
				.43,
				-1.6
			],
			[
				-.3,
				.43,
				-2.2
			],
			[
				-.6,
				.42,
				-2.34
			],
			[
				-.64,
				.41,
				-2.5
			]
		], .024, 12);
		const silencer = GEO.merge([at(box(.24, .14, .94, .05), -.25, .42, -.29)]);
		part({
			id: "exhaust",
			label: "Exhaust and silencer",
			assembly: "services",
			source: SRC.eng,
			what: "From the manifold down and back under the floor through the silencer, over the axle and out under the back on the right, hung on rubber loops.",
			specs: [["Pipe", "Ø 48 mm steel [inferred]"]]
		}, [m(GEO.merge([pipe, tail]), E.hot), m(silencer, M.silencer)], { explode: [
			0,
			-.5,
			0
		] });
	}
	/** the coolant's heat to the air (kW): about 30 % of the fuel's heat [inferred] */
	const heat = () => sim.s.fuel * .835 * 42.6 * .3 / 3.6;
	const prof = profile();
	const t = .008;
	const S = VAN.slider, F = VAN.fdoor;
	/** the A pillar's line on the side: the windscreen's edge moved back by `d` (z at height y) */
	const kWs = prof.pts.length - 9 + 4;
	const ws0 = prof.pts[kWs], ws1 = prof.pts[kWs + 1];
	const aLine = (d, y) => {
		const dz = ws1[0] - ws0[0], dy = ws1[1] - ws0[1], L = Math.hypot(dz, dy);
		return ws0[0] - dy / L * d + (y - (ws0[1] + dz / L * d)) * dz / dy;
	};
	const yA = (() => {
		let y = 1;
		for (let k = 0; k < 40; k++) y += (aLine(.13, y) - F.hinge) * .5;
		return y;
	})();
	/** @type {V2[]} */
	const fdoorHole = [
		[F.z0, F.y0],
		[F.hinge, F.y0],
		[F.hinge, yA],
		[aLine(.13, F.y1), F.y1],
		[F.z0, F.y1]
	];
	/** @type {V2[]} */
	const fdoorWin = [
		[F.z0 + .06, 1.42],
		[aLine(.18, 1.42), 1.42],
		[aLine(.18, 1.94), 1.94],
		[F.z0 + .06, 1.94]
	];
	const sideWins = {
		left: [zyRect(-.85, .12, 1.42, 1.94), zyRect(-2.2, -.95, 1.42, 1.94)],
		right: [
			zyRect(.3, 1.16, 1.42, 1.94),
			zyRect(-.85, .12, 1.42, 1.94),
			zyRect(-2.2, -.95, 1.42, 1.94)
		]
	};
	{
		const outline = insetEdges(prof.pts, prof.r);
		const sides = [];
		const seals = [];
		const glass = [];
		for (const sx of [-1, 1]) {
			const s = zyShape(outline, 0);
			s.holes.push(zyHole(fdoorHole, .03));
			if (sx > 0) s.holes.push(zyHole(zyRect(S.z0, S.z1, S.y0, S.y1), .04));
			const wins = sx > 0 ? sideWins.left : sideWins.right;
			for (const w of wins) {
				s.holes.push(zyHole(w, .05));
				const ring = zyShape(outsetRect(w, .014), .06);
				ring.holes.push(zyHole(w, .05));
				seals.push(onX(plate(ring, .004, 6), sx * (X + .002)));
				glass.push(onX(plate(zyShape(outsetRect(w, .006), .055), .005, 6), sx * (X - t / 2)));
			}
			sides.push(tone(onX(plate(s, t, 6), sx * (X - t / 2))));
			if (sx > 0) sides.push(tone(at(box(.024, .03, 1.2, .006), X + .012, 1.34, -.4)));
		}
		const houses = [];
		for (const zc of [axle.front, axle.rear]) for (const sx of [-1, 1]) {
			const a0 = Math.PI - Math.asin((VAN.sill - yw) / .435), a1 = Math.asin((VAN.sill - yw) / .435);
			/** @type {V2[]} */
			const arc = [];
			for (let k = 0; k <= 16; k++) {
				const a = a0 + (a1 - a0) * k / 16;
				arc.push([zc + .435 * Math.cos(a), yw + .435 * Math.sin(a)]);
			}
			houses.push(onX(plate(zyShape(arc, 0), .006, 6), sx * .66));
			const top = new three.Shape();
			top.absarc(0, 0, .441, a1, a0, false);
			top.absarc(0, 0, .435, a0, a1, true);
			top.closePath();
			houses.push(plate(top, X - .66 - t, 6).rotateY(Math.PI / 2).translate(sx * (.66 + (X - .66 - t) / 2), yw, zc));
		}
		const rust = [];
		for (const sx of [-1, 1]) {
			for (const [z0, z1] of [
				[-2.36, -2],
				[-1.1, 1.15],
				[2.04, 2.34]
			]) rust.push(onX(plate(zyShape(zyRect(z0, z1, VAN.sill + .004, VAN.sill + .07 + .03 * Math.sin(z0 * 7)), .02), .002, 4), sx * (X + .0012)));
			for (const zc of [axle.front, axle.rear]) {
				const lip = new three.Shape();
				lip.absarc(0, 0, .47, .35, Math.PI - .35, false);
				lip.absarc(0, 0, .432, Math.PI - .35, .35, true);
				lip.closePath();
				rust.push(plate(lip, .002, 12).rotateY(Math.PI / 2).translate(sx * (X + .0012), yw, zc));
			}
			/** @type {V2[]} */
			const blob = [];
			for (let k = 0; k < 9; k++) {
				const a = k / 9 * Math.PI * 2, rr = .06 + .025 * Math.sin(k * 2.3 + sx);
				blob.push([-1.35 + rr * 1.5 * Math.cos(a), .62 + rr * Math.sin(a)]);
			}
			rust.push(onX(plate(zyShape(blob, .025), .002, 4), sx * (X + .0012)));
		}
		part({
			id: "body-sides",
			label: "Body sides",
			assembly: "body",
			source: SRC.air,
			what: "The two pressed-steel sides, cream below the waist and blue above, their windows, door openings and wheel arches cut in; the wheel housings inside. Thirty years of sun have faded the blue, and the sills and arches are rusting through.",
			specs: [["Steel", "0.8 mm, painted [inferred]"], ["Paint", "Two-tone, cream and blue"]]
		}, [
			m(GEO.merge(sides), M.paint),
			m(GEO.merge(houses), M.trim),
			m(GEO.merge(rust), M.rust),
			m(GEO.merge(seals), M.rubber)
		], {
			explode: [
				0,
				.3,
				0
			],
			xray: "shell"
		});
		part({
			id: "side-glass",
			label: "Side windows",
			count: 5,
			assembly: "body",
			source: SRC.air,
			what: "Fixed side windows of toughened glass in rubber seals.",
			specs: [["Glass", "4 mm toughened"]]
		}, [m(GEO.merge(glass), M.glass)], { explode: [
			0,
			.32,
			0
		] });
		const ps = [];
		/** @type {THREE.BufferGeometry[]} */
		const screen = [];
		const n = prof.pts.length;
		for (let k = 0; k < n; k++) {
			if (!prof.seg[k]) continue;
			const a = prof.pts[k], b = prof.pts[(k + 1) % n], R0 = prof.r[k];
			const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
			/** @type {THREE.Path[]} */
			const holes = [];
			const hw = X - R0;
			if (k === kWs) {
				holes.push(roundHole([
					[-hw + .045, .05],
					[hw - .045, .05],
					[hw - .045, len - .045],
					[-hw + .045, len - .045]
				], .06));
				screen.push(onEdge(plate(roundPoly([
					[-hw + .04, .045],
					[hw - .04, .045],
					[hw - .04, len - .04],
					[-hw + .04, len - .04]
				], .06), .006, 8), a, b, -.006));
			}
			if (k === kWs - 3) holes.push(roundHole([
				[-.43, .08],
				[.43, .08],
				[.43, .37],
				[-.43, .37]
			], .03));
			if (k === n - 1) {
				holes.push(roundHole([
					[-.72, 2.06 - 1.94],
					[.72, 2.06 - 1.94],
					[.72, 2.06 - 1.42],
					[-.72, 2.06 - 1.42]
				], .05));
				screen.push(onEdge(plate(roundPoly([
					[-.725, .115],
					[.725, .115],
					[.725, .645],
					[-.725, .645]
				], .05), .005, 8), a, b, -.005));
			}
			ps.push(tone(edgePanel(a, b, R0, t, W, holes)));
		}
		part({
			id: "front-roof-back",
			label: "Nose, roof and back",
			assembly: "body",
			source: SRC.air,
			what: "The body’s ends and top: the short nose with the grille’s opening, the bonnet, the windscreen’s frame, the roof, and the back with its two doors (shut here); every edge rounded onto the sides.",
			specs: [["Roof", "Ribbed steel, 0.8 mm [inferred]"]]
		}, [m(GEO.merge(ps), M.paint)], {
			explode: [
				0,
				.9,
				0
			],
			xray: "shell"
		});
		part({
			id: "windscreen",
			label: "Windscreen and back window",
			assembly: "body",
			source: SRC.air,
			what: "The laminated windscreen, nearly upright over the short nose, and the back window between the rear doors.",
			specs: [["Windscreen", "6.4 mm laminated"], ["Back", "4 mm toughened"]]
		}, [m(GEO.merge(screen), M.glass)], { explode: [
			0,
			.5,
			.5
		] });
		const fx = X - t - .004;
		/** @type {V2[]} */
		const fo = [[-fx, 2.15], [fx, 2.15]];
		for (const zc of [axle.front, axle.rear]) fo.push([fx, zc + .44], [.655, zc + .44], [.655, zc - .44], [fx, zc - .44]);
		fo.push([fx, VAN.rear + .012], [-fx, VAN.rear + .012]);
		for (const zc of [axle.rear, axle.front]) fo.push([-fx, zc - .44], [-.655, zc - .44], [-.655, zc + .44], [-fx, zc + .44]);
		const fs = roundPoly(xz(fo), .004);
		fs.holes.push(roundHole(xz([
			[-.3, .84],
			[-.3, 2.12],
			[.3, 2.12],
			[.3, .84]
		]), .04));
		const floorG = onY(plate(fs, .02, 4), floor - .01);
		const mat = onY(plate(fs, .004, 4), floor + .002);
		const wall = at(slab(1.7, .56, t), 0, floor + .28, 2.16);
		part({
			id: "floor",
			label: "Floor",
			assembly: "body",
			source: SRC.air,
			what: "The ribbed steel floor on the frame, cut round the engine’s cover and the wheel housings, a rubber mat over it; the wall under the dashboard closes the cab from the nose.",
			specs: [["Height", `${Math.round(floor * 1e3)} mm off the road`]]
		}, [
			m(floorG, M.cream),
			m(mat, M.floor),
			m(wall, M.cream)
		], { explode: [
			0,
			.2,
			0
		] });
		const bump = (z, dz) => GEO.merge([
			at(box(1.82, .15, .13, .03), 0, .53, z),
			at(box(.16, .15, .2, .04), .86, .53, z - dz * .04),
			at(box(.16, .15, .2, .04), -.86, .53, z - dz * .04),
			at(box(.06, .08, .12, .01), .42, .53, z - dz * .1),
			at(box(.06, .08, .12, .01), -.42, .53, z - dz * .1)
		]);
		part({
			id: "bumpers",
			label: "Bumpers and number plates",
			assembly: "body",
			source: SRC.air,
			what: "Steel bumpers front and back on brackets to the frame, painted black; the plates (blank) on them.",
			specs: [["Steel", "2 mm pressed"]]
		}, [m(GEO.merge([bump(VAN.front + .12, 1), bump(VAN.rear - .1, -1)]), halfCut(M.trim)), m(GEO.merge([at(slab(.52, .11, .006), 0, .53, VAN.front + .19), at(slab(.52, .11, .006), 0, .8, VAN.rear - .006)]), halfCut(M.plate))], { explode: [
			0,
			-.2,
			0
		] });
		const lights = [], lenses = [], reds = [], ambers = [];
		for (const sx of [-1, 1]) {
			lights.push(at(box(.27, .18, .05, .01), sx * .62, 1.12, VAN.front - .012));
			lenses.push(at(box(.24, .15, .012, .004), sx * .62, 1.12, VAN.front + .014));
			ambers.push(at(box(.12, .06, .03, .008), sx * .62, .99, VAN.front + 0), at(box(.06, .12, .03, .008), sx * .81, 1.1, VAN.rear - .004));
			reds.push(at(box(.12, .24, .03, .008), sx * .79, .88, VAN.rear - .004));
			lenses.push(at(box(.08, .06, .03, .008), sx * .79, .72, VAN.rear - .004));
		}
		const grille = [];
		for (let k = 0; k < 6; k++) grille.push(at(box(.88, .022, .03, .006), 0, 1.03 + k * .05, VAN.front - .012));
		grille.push(at(box(.9, .31, .01, .004), 0, 1.155, VAN.front - .04));
		part({
			id: "lights",
			label: "Lights and grille",
			assembly: "body",
			source: SRC.air,
			what: "Two square sealed-beam headlights with their indicators under them in the nose, the grille between them that lets the air to the radiator; the tail lights, indicators and reversing lights at the back corners.",
			specs: [["Headlights", "Sealed beam, 12 V 60/55 W [inferred]"]]
		}, [
			m(GEO.merge(lights), M.reflector),
			m(GEO.merge(lenses), M.lens),
			m(GEO.merge(reds), M.red),
			m(GEO.merge(ambers), M.amber),
			m(GEO.merge(grille), M.trim)
		], { explode: [
			0,
			0,
			.5
		] });
		const gut = [];
		for (const sx of [-1, 1]) gut.push(cyl([
			sx * .9,
			VAN.roof - .012,
			-2.36
		], [
			sx * .9,
			VAN.roof - .012,
			1.86
		], .01, 8));
		const wip = [];
		for (const wx of [-.45, .3]) wip.push(onEdge(GEO.merge([at(slab(.012, .42, .012), 0, .26, .012), at(slab(.02, .4, .02), .02, .26, .024)]).rotateZ(-.12).translate(wx, 0, 0), ws0, ws1, 0));
		part({
			id: "gutters-wipers",
			label: "Gutters and wipers",
			assembly: "body",
			source: SRC.air,
			what: "The rain gutters along the roof’s edges, where the rack’s feet clamp; the two wipers on the windscreen.",
			specs: [["Wipers", "2 × 450 mm [inferred]"]]
		}, [m(GEO.merge(gut), M.trim), m(GEO.merge(wip), M.trim)], { explode: [
			0,
			.6,
			.3
		] });
	}
	/** @type {ReturnType<typeof hinge>[]} */
	const fdoors = [];
	/** a door's panels, its skin in the two tones @param {V2[]} hole @param {V2[]} win @param {1 | -1} sx */
	const doorPanelsT = (hole, win, sx) => {
		const d = doorPanels(hole, win, {
			x: X,
			sx,
			split: 1.4
		});
		tone(d.skin);
		return d;
	};
	for (const sx of [1, -1]) {
		const h = hinge(body, {
			at: [
				sx * X,
				0,
				F.hinge
			],
			axis: "y",
			max: -sx * 1.2,
			name: `door-${sx > 0 ? "left" : "right"}`
		});
		const d = doorPanelsT(fdoorHole, fdoorWin, sx);
		const mv = (g) => g.translate(-sx * X, 0, -F.hinge);
		const extra = GEO.merge([at(box(.05, .04, .3, .01), sx * (X - .08), 1.08, 1.62), at(box(.02, .025, .08, .006), sx * (X - .07), 1.22, F.z0 + .12)]);
		const outside = GEO.merge([
			at(box(.02, .03, .14, .008), sx * (X + .012), 1.3, F.z0 + .12),
			cyl([
				sx * X,
				1.48,
				2.06
			], [
				sx * (X + .13),
				1.5,
				2.05
			], .012, 8),
			at(box(.05, .19, .12, .02), sx * (X + .16), 1.55, 2.05)
		]);
		const glassM = at(slab(.04, .17, .004), sx * (X + .16), 1.55, 2.05 - .062);
		kit.part(h.pivot, {
			id: `door-${sx > 0 ? "left" : "right"}`,
			label: sx > 0 ? "Front door, left" : "Front door, right (the driver’s)",
			assembly: "doors",
			source: SRC.air,
			what: "A hinged steel door over the front wheel, its window wound down by a handle inside; its mirror on its front corner. It swings out on two hinges at its front edge.",
			moves: "Opens to 70° on its hinges.",
			drive: "By hand (the Doors slider)",
			specs: [["Opening", `${Math.round((F.hinge - F.z0) * 1e3)} × ${Math.round((F.y1 - F.y0) * 1e3)} mm`]]
		}, { explode: [
			sx * .55,
			.1,
			.25
		] }, body);
		h.pivot.add(m(mv(d.skin), M.paint), m(mv(d.glass), M.glass), m(mv(d.card), M.card), m(mv(extra), M.vinyl), m(mv(outside), M.trim), m(mv(glassM), M.chrome));
		fdoors.push(h);
	}
	const slider = slide(body, {
		path: [
			[
				0,
				0,
				0
			],
			[
				.075,
				0,
				-.07
			],
			[
				.075,
				0,
				-.3
			],
			[
				.075,
				0,
				-1.02
			]
		],
		name: "slider"
	});
	{
		const d = doorPanelsT(zyRect(S.z0, S.z1, S.y0, S.y1), zyRect(.3, 1.16, 1.42, 1.94), 1);
		const bits = GEO.merge([
			at(box(.02, .03, .16, .008), X + .012, 1.3, S.z1 - .14),
			cyl([
				X - .03,
				1.34,
				S.z0 + .03
			], [
				X + .012,
				1.34,
				S.z0 - .06
			], .008, 8),
			cyl([
				X + .012,
				1.31,
				S.z0 - .06
			], [
				X + .012,
				1.37,
				S.z0 - .06
			], .014, 12),
			cyl([
				X - .04,
				S.y1 - .04,
				S.z1 - .06
			], [
				X - .12,
				S.y1 - .02,
				S.z1 - .06
			], .008, 8),
			cyl([
				X - .04,
				S.y0 + .05,
				S.z1 - .06
			], [
				X - .12,
				S.y0 + .08,
				S.z1 - .06
			], .008, 8)
		]);
		kit.part(new three.Group().add(m(d.skin, M.paint), m(d.glass, M.glass), m(d.card, M.card), m(bits, M.trim)), {
			id: "sliding-door",
			label: "Sliding door",
			assembly: "doors",
			source: SRC.air,
			what: "The wide door on the left into the seats behind: its rollers run in three rails, top, bottom and the centre rail along the side, that first pull it out of its opening and then slide it back along the van.",
			moves: "Out of its opening, then back along the side (the Doors slider).",
			drive: "By hand",
			specs: [["Opening", `${Math.round((S.z1 - S.z0) * 1e3)} × ${Math.round((S.y1 - S.y0) * 1e3)} mm`], ["Travel", "1,020 mm"]]
		}, { explode: [
			.6,
			.1,
			0
		] }, slider.carriage);
	}
	const gauges = cluster(kit, {
		dials: [{
			x: -.07,
			y: 0,
			r: .055,
			max: 140
		}, {
			x: .07,
			y: 0,
			r: .055,
			max: 5e3,
			ticks: 11
		}],
		face: M.dial,
		tick: M.white,
		needle: M.needle,
		bezel: M.chrome,
		housing: M.dash
	});
	{
		part({
			id: "engine-cover",
			label: "Engine cover",
			assembly: "cab",
			source: SRC.eng,
			what: "The padded box between the front seats over the engine (the “doghouse”): lift it off to reach the engine from inside; its lining keeps the noise and heat out of the cab.",
			specs: [["Lining", "Felt and vinyl [inferred]"]]
		}, [m(at(box(.6, 1 - floor, 1.28, .07, 3), 0, (floor + 1) / 2, 1.48), M.vinyl)], {
			explode: [
				0,
				.9,
				0
			],
			xray: "shell"
		});
		const f = seatGeometry({
			w: .48,
			d: .5,
			h: .32,
			back: .62,
			rake: .26
		});
		const fronts = [-1, 1].map((sx) => [f.fabric.clone().translate(sx * .57, floor, VAN.driver.z), f.base.clone().translate(sx * .57, floor, VAN.driver.z)]);
		part({
			id: "front-seats",
			label: "Front seats",
			count: 2,
			assembly: "cab",
			source: SRC.air,
			what: "The driver’s seat and one passenger’s, each side of the engine’s cover, on pedestals over the front wheel housings.",
			specs: [["Cover", "Striped moquette, worn"]]
		}, [m(GEO.merge(fronts.map((p) => p[0])), M.fabric), m(GEO.merge(fronts.map((p) => p[1])), M.vinyl)], { explode: [
			0,
			.7,
			.1
		] });
		const b2 = seatGeometry({
			w: 1.2,
			d: .48,
			h: .32,
			back: .6,
			rake: .22
		});
		part({
			id: "middle-bench",
			label: "Middle bench",
			assembly: "cab",
			source: SRC.air,
			what: "A bench for three behind the front seats, an aisle beside it to the sliding door.",
			specs: [["Seats", "3"]]
		}, [m(b2.fabric.translate(-.27, floor, -.02), M.fabric), m(b2.base.translate(-.27, floor, -.02), M.vinyl)], { explode: [
			0,
			.75,
			0
		] });
		const b3 = seatGeometry({
			w: 1.76,
			d: .48,
			h: .32,
			back: .6,
			rake: .22
		});
		part({
			id: "rear-bench",
			label: "Rear bench",
			assembly: "cab",
			source: SRC.air,
			what: "The full-width bench at the back, over the rear axle’s front; the luggage behind it.",
			specs: [["Seats", "4"]]
		}, [m(b3.fabric.translate(0, floor, -1.12), M.fabric), m(b3.base.translate(0, floor, -1.12), M.vinyl)], { explode: [
			0,
			.8,
			-.1
		] });
		const dash = GEO.merge([
			at(box(1.8, .3, .42, .03, 2), 0, 1.3, 1.95),
			at(box(1.82, .06, .34, .02, 2), 0, 1.47, 2),
			at(box(.32, .11, .06, .02), VAN.driver.x, 1.4, 1.73)
		]);
		const faces = GEO.merge([
			at(slab(.36, .13, .01), .52, 1.24, 1.735),
			at(slab(.18, .05, .012), 0, 1.33, 1.735),
			...[
				-.82,
				-.25,
				.25,
				.82
			].map((x) => at(slab(.1, .04, .01), x, 1.4, 1.735))
		]);
		gauges.group.position.set(VAN.driver.x, 1.38, 1.7);
		gauges.group.rotation.x = .3;
		part({
			id: "dashboard",
			label: "Dashboard and gauges",
			assembly: "cab",
			source: SRC.air,
			what: "The moulded dashboard under the windscreen: the speedometer and the rev counter in their binnacle before the driver, the radio, four vents, the glovebox.",
			moves: "Its needles show the speed and the engine’s revs.",
			specs: [["Gauges", "Speed to 140 km/h, revs to 5,000 rpm"]]
		}, [
			m(dash, M.dash),
			m(faces, M.vinyl),
			gauges.group
		], {
			explode: [
				0,
				.5,
				.4
			],
			tag: {
				text: "Gauges",
				at: [
					VAN.driver.x,
					1.45,
					1.7
				],
				side: "right",
				value: () => `${fmt(kmh())} km/h · ${fmt(sim.s.rpm)} rpm`
			}
		});
		const sw = steeringWheelGeometry({
			R: .2,
			column: .5
		});
		const wheel = new three.Group();
		wheel.add(m(sw.rim, M.vinyl), m(sw.hub, M.dash), m(sw.column, M.dash));
		wheel.position.set(...VAN.wheel);
		wheel.rotation.x = .95;
		part({
			id: "steering-wheel",
			label: "Steering wheel and column",
			assembly: "cab",
			source: SRC.air,
			what: "A large, nearly flat wheel, as on a bus, on its column down to the floor, where a shaft with two universal joints runs to the rack.",
			moves: "Turned by the driver (held straight here).",
			specs: [["Diameter", "400 mm"]]
		}, [wheel], { explode: [
			0,
			.55,
			.1
		] });
		const ped = [];
		for (const [dx, w] of [
			[-.13, .06],
			[-.02, .08],
			[.1, .05]
		]) ped.push(cyl([
			VAN.driver.x + dx,
			1.12,
			1.86
		], [
			VAN.driver.x + dx,
			.8,
			1.68
		], .008, 8), at(box(w, .09, .012, .004), VAN.driver.x + dx, .77, 1.67));
		ped.push(cyl([
			-.31,
			floor + .02,
			.9
		], [
			-.31,
			floor + .2,
			1.08
		], .012, 8));
		part({
			id: "pedals",
			label: "Pedals and handbrake",
			count: 3,
			assembly: "cab",
			source: SRC.air,
			what: "Clutch, brake and accelerator hanging from under the dashboard; the handbrake lever by the driver’s seat pulls the rear drums’ shoes by cable.",
			specs: [["Brakes", "Servo-assisted hydraulic, two circuits"]]
		}, [m(GEO.merge(ped), M.vinyl)], { explode: [
			0,
			.4,
			.3
		] });
	}
	{
		const y = 2.33;
		const r = [];
		for (const sx of [-1, 1]) r.push(bar([
			sx * .85,
			y,
			-2.1
		], [
			sx * .85,
			y,
			1.9
		], .02, 12));
		for (const z of [
			-2.1,
			-.7,
			.6,
			1.9
		]) {
			r.push(bar([
				-.85,
				y,
				z
			], [
				.85,
				y,
				z
			], .017, 10));
			for (const sx of [-1, 1]) r.push(bar([
				sx * .85,
				y,
				z
			], [
				sx * .9,
				VAN.roof + .005,
				z
			], .014, 8), at(box(.05, .04, .06, .008), sx * .9, VAN.roof + .01, z));
		}
		part({
			id: "roof-rack",
			label: "Roof rack",
			assembly: "roof",
			source: SRC.air,
			what: "A welded tube rack clamped to the roof’s gutters on eight feet: two rails and four crossbars to tie the load to.",
			specs: [["Tube", "Ø 40 mm steel"], ["Load", "Up to 100 kg on the roof [inferred]"]]
		}, [m(GEO.merge(r), M.rack)], { explode: [
			0,
			1,
			0
		] });
		const bag = (w, h, d, x, z) => {
			const yc = 2.35 + h / 2;
			return {
				shell: at(box(w, h, d, Math.min(.08, h / 3), 3), x, yc, z),
				straps: GEO.merge([
					at(box(w + .008, h + .008, .035, .01), x, yc, z - d / 4),
					at(box(w + .008, h + .008, .035, .01), x, yc, z + d / 4),
					at(new three.TorusGeometry(.06, .01, 6, 16, Math.PI), x, yc + h / 2, z)
				])
			};
		};
		const bags = [
			[
				"bag-red",
				"Red holdall",
				M.bagRed,
				.7,
				.4,
				.9,
				-.4,
				-1.3,
				.9
			],
			[
				"bag-blue",
				"Blue holdall",
				M.bagBlue,
				.6,
				.35,
				.8,
				.4,
				-1.2,
				1.05
			],
			[
				"bag-green",
				"Green duffel",
				M.bagGreen,
				.8,
				.45,
				.7,
				.25,
				.1,
				1.2
			]
		];
		for (const [id, label, mat, w, h, d, x, z, up] of bags) {
			const b = bag(w, h, d, x, z);
			part({
				id,
				label,
				assembly: "roof",
				source: SRC.air,
				what: "A soft canvas bag of the travellers’ things, strapped shut and tied to the rack.",
				specs: [["Size", `${Math.round(w * 100)} × ${Math.round(d * 100)} × ${Math.round(h * 100)} cm`], ["Weight", "~20 kg [inferred]"]]
			}, [m(b.shell, mat), m(b.straps, M.trim)], { explode: [
				0,
				up + .4,
				0
			] });
		}
		part({
			id: "sack",
			label: "Sack of rice",
			assembly: "roof",
			source: SRC.air,
			what: "A woven sack of rice, its neck tied off, lying on the rack.",
			specs: [["Weight", "25 kg"]]
		}, [m(at(box(.6, .35, .9, .16, 3), -.4, 2.525, .2), M.sack), m(cyl([
			-.4,
			2.52,
			.64
		], [
			-.4,
			2.52,
			.74
		], .05, 12), M.sack)], { explode: [
			0,
			1.5,
			0
		] });
		const spare = GEO.lathe([
			[.18, -.088],
			[.25, -.092],
			[.305, -.08],
			[.322, -.045],
			[.322, .045],
			[.305, .08],
			[.25, .092],
			[.18, .088]
		], 40).translate(0, 2.4450000000000003, 1.4);
		part({
			id: "spare-tyre",
			label: "Spare wheel",
			assembly: "roof",
			source: SRC.tyre,
			what: "A fifth wheel and tyre lying flat on the front of the rack.",
			specs: [["Tyre", TYRE.code]]
		}, [m(spare, R.tyre), m(latheY([
			[.05, -.055],
			[.178, -.055],
			[.178, .055],
			[.05, .055]
		], 32).translate(0, 2.4450000000000003, 1.4), R.rimSteel)], { explode: [
			0,
			1,
			.3
		] });
		const ropes = [
			hose([
				[
					-.85,
					y,
					-1.3
				],
				[
					-.72,
					2.7600000000000002,
					-1.3
				],
				[
					0,
					2.77,
					-1.28
				],
				[
					.7,
					2.72,
					-1.22
				],
				[
					.85,
					y,
					-1.2
				]
			], .006, 6),
			hose([
				[
					-.85,
					y,
					.15
				],
				[
					-.6,
					2.71,
					.15
				],
				[
					.1,
					2.83,
					.12
				],
				[
					.62,
					2.81,
					.1
				],
				[
					.85,
					y,
					.1
				]
			], .006, 6),
			hose([
				[
					-.85,
					y,
					1.4
				],
				[
					-.3,
					2.5700000000000003,
					1.4
				],
				[
					.3,
					2.5700000000000003,
					1.4
				],
				[
					.85,
					y,
					1.4
				]
			], .006, 6)
		];
		part({
			id: "ropes",
			label: "Ropes",
			count: 3,
			assembly: "roof",
			source: SRC.air,
			what: "Three ropes over the load, tied off to the rack’s rails.",
			specs: [["Rope", "6 mm polypropylene"]]
		}, [m(GEO.merge(ropes), M.strap)], { explode: [
			0,
			1.7,
			0
		] });
	}
	const ctl = {
		speed: {
			label: "Speed asked",
			min: 0,
			max: 120,
			value: speed,
			step: 1,
			unit: "km/h",
			ends: ["Standing", "120 km/h"]
		},
		grade: {
			label: "Grade",
			min: -15,
			max: 35,
			value: grade,
			step: .5,
			unit: "%",
			ends: ["Downhill", "Steep climb"]
		},
		load: {
			label: "Load inside (people and bags)",
			min: 0,
			max: VEHICLE.payload,
			value: load,
			step: 10,
			unit: "kg",
			ends: ["Empty", "Full payload"]
		},
		doors: {
			label: "Doors open",
			min: 0,
			max: 1,
			value: doors,
			step: .01,
			digits: 2,
			ends: ["Shut", "Open"]
		}
	};
	/** what the driver is asked for: the sliders, or the break's overload up its hill @param {{ broken: boolean }} env */
	const input = (env) => ({
		vSet: ctl.speed.value * KMH,
		grade: env.broken ? .35 : ctl.grade.value / 100,
		load: env.broken ? VEHICLE.payload * 2.5 : ctl.load.value
	});
	sim.settle(input({ broken: false }));
	let fanA = 0;
	kit.onTick((dt, env) => {
		const inp = input(env);
		sim.step(dt, inp);
		const s = sim.s;
		const al = (s.sagF - s.sagR) / VEHICLE.axles.wb;
		body.rotation.x = al;
		body.position.y = -s.sagF + al * axle.front;
		body.updateMatrix();
		for (const c of Object.values(corners)) c.set(s.wheelAng);
		for (const f of front) f.update();
		rearAxle.update(s.sagR, s.wheelAng, s.propAng);
		engine.update(s.engAng, s.propAng, s.launch);
		shaft.set([
			inFrame(body, engine.points.out),
			inFrame(body, BEARING),
			PINION
		], s.propAng);
		fanA -= (heat() > 8 ? 2200 / 60 / 40 : 0) * Math.PI * 2 * dt;
		fan.rotation.z = fanA;
		const k = clamp(ctl.doors.value);
		for (const d of fdoors) d.set(k);
		slider.set(k);
		gauges.set([kmh(), s.rpm]);
		const r = lab.read;
		const lug = !s.stalled && s.theta > .97 && s.a < -.05;
		r.value = Math.max(0, s.Pw) / 1e3;
		r.bad = s.stalled || lug && s.gear === 1 || s.bottomed;
		r.state = s.stalled ? env.broken ? `stalled: ${fmt(VEHICLE.payload * 2.5)} kg in it up a 35 % grade` : "stalled: more than first gear can pull" : inp.vSet < .05 && s.v < .05 ? "standing, idling in neutral" : s.launch ? "pulling away, the clutch slipping" : lug ? `lugging in ${ordinal(s.gear)}: full throttle, the speed falling` : s.theta > .97 ? `full throttle in ${ordinal(s.gear)}` : s.Fb > 1 ? inp.grade < -.005 ? `braking down the hill in ${ordinal(s.gear)}` : `braking to the speed asked in ${ordinal(s.gear)}` : s.theta < .01 ? `coasting on the engine in ${ordinal(s.gear)}` : s.v > inp.vSet + .5 ? `easing off to the speed asked in ${ordinal(s.gear)}` : `cruising in ${ordinal(s.gear)}`;
		r.sub = s.stalled ? `first gear gives at most ${fmt(s.can)} N at the wheels, the hill and the road take ${fmt(s.need)} N · ${env.broken ? "take the break back" : "move a slider"} to start it again` : `${fmt(kmh())} km/h · ${fmt(s.rpm)} rpm · ${fmt(Math.max(0, s.Pe) / 1e3, 1)} kW at the flywheel · the road takes ${fmt(s.road.F)} N (rolling ${fmt(s.road.roll)}, climbing ${fmt(s.road.climb)}, air ${fmt(s.road.air)}) · ${s.v > .5 ? `${fmt(s.l100, 1)} L/100 km` : `${fmt(s.fuel, 2)} L/h`}${s.bottomed ? " · the springs on their bump stops" : ""}`;
	});
	/** @type {import('$lib/assets/parts.js').Lab} */
	const lab = {
		hero: {
			label: "Power at the wheels",
			unit: "kW",
			max: 60,
			digits: 1
		},
		read: {
			value: 0,
			state: "",
			sub: "",
			bad: false
		},
		controls: ctl,
		how: {
			text: "A driver holds the speed asked: the road takes a force to roll the tyres, to lift the van up the grade and to push the air aside, and holding the speed takes that force times the speed at the wheels, more through the gearbox’s and the axle’s losses at the engine. The driver picks the highest gear that gives that push without the engine running too slow, opens the throttle for it, and brakes downhill when even the shut throttle pushes too much. Where first gear on the engine’s full-load curve gives less than the hill takes, the speed falls, the engine lugs down and stalls. The fuel comes from the engine’s work plus its own friction. The axles’ loads shift back up a hill and as it pulls, and the springs sink by the load over their rates. The doors are moved by their slider alone. Shown slowed: the wheels 10 times, the engine, the gearbox and the propshaft 40 times.",
			eqs: [
				"F = m g Crr cos θ + m g sin θ + ½ ρ Cd A v²      m = 1,950 kg + load, Crr = 0.011, Cd A = 1.62 m²",
				"P_wheels = F v        P_engine = P_wheels / η      η = 0.90",
				"n = (v / r) · i_gear · i_axle      r = 0.316 m, i = 4.00 … 0.80, i_axle = 4.30",
				"T_engine ≤ T_full(n)      152 N·m at 2,400 rpm, 131 N·m at 4,000",
				"m_eff dv/dt = T i η / r − F      m_eff = m + (4 J_w + J_e i² η) / r²",
				"fuel = (T + T_friction) ω · 200 g/kWh      T_friction from 1.6 bar",
				"sag = ΔF_axle / k      k = 32 kN/m front, 52 kN/m rear (a wheel)"
			]
		},
		breakIt: {
			label: "Overload it up a 35 % hill",
			run: () => {},
			reset: () => sim.restart()
		},
		cut: {
			a: [
				1,
				0,
				0
			],
			b: [
				0,
				1,
				0
			],
			center: [
				0,
				.45,
				0
			],
			reach: .5
		}
	};
	kit.seal({ lab }).tick(0, {
		broken: false,
		time: 0,
		slow: 0,
		cut: 0,
		xray: 0
	});
	return root;
}

//#endregion
//#region src/lib/app/versions.js
/** @typedef {{ v: number, date: string, note: string }} Change one version: its number, when, what changed */
/**
* @template B
* @typedef {Change & { build: B, kept: boolean }} Version a version and what builds it; `kept`: its own builder (the
*   latest's, or a frozen one), not the latest's standing in for one that was not kept
*/
/** The first version of everything: what every asset was when versions began. */
const FIRST = {
	v: 1,
	date: "2026-10-05",
	note: "First version"
};
/**
* An asset's versions, oldest first: its history, the latest built by `current`. A history lists every version; the
* ones before the latest bring their own (frozen) builders. With no history the asset is at v1.
* @template B
* @param {B} current the asset's builder today
* @param {(Change & { build?: B })[]} [history]
* @returns {Version<B>[]}
*/
function versionsOf(current, history = [FIRST]) {
	const sorted = [...history].sort((a, b) => a.v - b.v);
	return sorted.map((c, i) => {
		const latest = i === sorted.length - 1;
		return {
			v: c.v,
			date: c.date,
			note: c.note,
			build: latest ? current : c.build ?? current,
			kept: latest || c.build !== void 0
		};
	});
}
/** The latest version number. @param {{ v: number }[]} versions */
const latestOf = (versions) => versions[versions.length - 1]?.v ?? 1;
/**
* Every item of a list with its versions: `versions` from its `HISTORY` entry (by id) and its builder (`key`), and
* `version` its latest number.
* @template {{ id: string }} T
* @param {T[]} items @param {keyof T} key @param {Record<string, (Change & { build?: any })[]>} [history]
* @returns {(T & { versions: Version<any>[], version: number })[]}
*/
function versioned(items, key, history = {}) {
	return items.map((it) => {
		const versions = versionsOf(it[key], history[it.id]);
		return {
			...it,
			versions,
			version: latestOf(versions)
		};
	});
}

//#endregion
//#region src/lib/machines/index.js
/** @typedef {import('$lib/actors').Actor} Actor */
/** @typedef {import('$lib/actors').Family} Family */
/** the kinds' older versions, by id, each with its frozen variants (the rest are at v1)
* @type {Record<string, (import('$lib/app/versions.js').Change & { build?: Actor[] })[]>} */
const HISTORY = /* @__PURE__ */ (() => ({ van: [{
	...FIRST,
	date: "2026-10-14"
}] }))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "van",
	label: "Travel van",
	note: "the old minibus of the MaiaCity intro, built at AirSup’s realism: every part its own in measured materials (a ladder frame, wishbones and leaf springs, a 2.4 L diesel under the cover between the front seats with its pistons, crank, camshaft and gears to cut open, a 5-speed gearbox and a live axle), its doors open, and a solver drives it: the power at its wheels to hold a speed on a grade with a load, its gear, revs and fuel, its springs sinking; overloaded up a steep hill it lugs and stalls",
	from: "MaiaCity V1: the intro’s travel van",
	variants: [{
		id: "van",
		label: "Travel van",
		note: "5.3 × 1.9 m, 2.13 m to its roof and 2.84 m to its bags; two-tone, faded and rusting; a sliding door and two front doors; eleven seats; 1,950 kg with its roof load",
		make: () => castOf(van())
	}]
}];
/** @type {Family[]} */
const MACHINES = /* @__PURE__ */ (() => versioned(LIST, "variants", HISTORY))();

//#endregion
//#region src/lib/assets/refs.js
/**
* The asset `id` at version `v` (its latest when not given), and a kind's variant (the one asked for, or its first), in a
* group's list: its item, its version and its builder. Undefined if there is no such asset, version or variant.
* @param {Item[]} list @param {string} id @param {number} [v] @param {string} [variant]
* @returns {{ item: Item, version: AnyVersion, build: any, kept: boolean } | undefined}
*/
function pick(list, id, v, variant) {
	const item = list.find((x) => x.id === id);
	const version = item && (v === void 0 ? item.versions[item.versions.length - 1] : item.versions.find((x) => x.v === v));
	if (!item || !version) return void 0;
	let build = version.build;
	if (Array.isArray(build) && build.every((x) => typeof x?.make === "function")) {
		build = (variant ? build.find((x) => x.id === variant) : build[0])?.make;
		if (!build) return void 0;
	} else if (variant) return void 0;
	return {
		item,
		version,
		build,
		kept: version.kept
	};
}

//#endregion
//#region src/lib/assets/recipe.js
/** @typedef {import('./groups.js').Item} Item @typedef {import('./groups.js').AnyVersion} AnyVersion */
/** @typedef {import('./card.js').Meta} Meta */
/** the keys of `o` that are set, as a fresh plain object */
const set = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
/**
* What a recipe says of the asset it builds: a kind's variant named (the one asked for, or its first), its label
* with the variant's, its note the variant's or the version's.
* @param {string} group @param {Item} item @param {AnyVersion} version @param {string} [variant]
* @returns {Meta}
*/
function metaOf(group, item, version, variant) {
	const v = Array.isArray(version.build) ? version.build.find((x) => x.id === (variant ?? version.build[0]?.id)) : null;
	return set({
		group,
		id: item.id,
		version: version.v,
		variant: variant ?? v?.id,
		label: v?.label ? `${item.label}: ${v.label}` : item.label,
		note: v?.note ?? version.note,
		params: item.params?.length ? JSON.parse(JSON.stringify(item.params)) : void 0
	});
}
/**
* The recipe of one asset in a group's list: what its file gives the engine. Throws when it has no builder of its own.
* @param {string} group @param {Item[]} list @param {string} id @param {number} v @param {string | null} [variant]
* @returns {{ meta: Meta, build: (...args: any[]) => any }}
*/
function recipeIn(group, list, id, v, variant) {
	const got = pick(list, id, v, variant ?? void 0);
	if (!got) throw new Error(`no asset ${group}/${id}@${v}${variant ? `:${variant}` : ""}`);
	if (!got.kept || typeof got.build !== "function") throw new Error(`${group}/${id}@${v}: no builder of its own`);
	return {
		meta: metaOf(group, got.item, got.version, variant ?? void 0),
		build: got.build
	};
}
/**
* Every recipe a group's list holds: each version that kept its builder, each variant of it.
* @param {Item[]} list @returns {{ id: string, v: number, variant: string | null }[]}
*/
function recipesIn(list) {
	/** @type {{ id: string, v: number, variant: string | null }[]} */
	const out = [];
	for (const item of list) for (const version of item.versions.filter((x) => x.kept)) if (Array.isArray(version.build)) for (const b of version.build) out.push({
		id: item.id,
		v: version.v,
		variant: b.id
	});
	else out.push({
		id: item.id,
		v: version.v,
		variant: null
	});
	return out;
}

//#endregion
//#region \0entry
const recipe = (id, v, variant) => recipeIn("machines", MACHINES, id, v, variant);
const list = () => recipesIn(MACHINES);

//#endregion
exports.list = list;
exports.recipe = recipe;