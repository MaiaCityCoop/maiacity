/** A texture tiled to a world size: `metres` of surface per repeat of the image. */
function tiled(tex, repeatX, repeatY = repeatX) {
	const t = tex.clone();
	t.repeat.set(repeatX, repeatY);
	t.wrapS = t.wrapT = three.RepeatWrapping;
	t.needsUpdate = true;
	return t;
}
/**
* The low sun on the glass: the panels that face it glow warm, most where they are seen at a grazing angle. Off (0)
* unless a film shot turns it up (its `glass` light); the world sets where the sun is every frame. Shared by every
* dome's glass, near or far.
*/
const glassSheen = /* @__PURE__ */ (() => ({
	uGlassSheen: { value: 0 },
	uGlassSheenColor: { value: new three.Color("#ffb070") },
	uGlassSun: { value: new three.Vector3(0, 1, 0) }
}))();
function withSheen(m) {
	m.onBeforeCompile = (sh) => {
		Object.assign(sh.uniforms, glassSheen);
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uGlassSheen;\nuniform vec3 uGlassSheenColor;\nuniform vec3 uGlassSun;").replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
				if ( uGlassSheen > 0.0 ) {
					vec3 sunV = normalize( ( viewMatrix * vec4( uGlassSun, 0.0 ) ).xyz );
					float facing = max( dot( normal, sunV ), 0.0 );
					float grazing = pow( 1.0 - abs( dot( normal, normalize( vViewPosition ) ) ), 2.0 );
					totalEmissiveRadiance += uGlassSheenColor * uGlassSheen * facing * ( 0.35 + 0.65 * grazing );
				}`);
	};
	m.customProgramCacheKey = () => "glass-sheen";
	return m;
}
/**
* The dome's panels are solar glass: clear glass with rows of cells laid in it,
* lightly tinted, with gaps between the cells so the light still falls through
* to the forest inside. One triangle of it, drawn once, on every panel.
*/
let solarCache = null;
function solarGlass() {
	if (solarCache) return solarCache;
	const s = 256;
	const c = document.createElement("canvas");
	c.width = c.height = s;
	const x = c.getContext("2d");
	x.fillStyle = "rgba(220,238,242,0.10)";
	x.fillRect(0, 0, s, s);
	x.save();
	x.beginPath();
	x.moveTo(s / 2, s * .1);
	x.lineTo(s * .92, s * .9);
	x.lineTo(s * .08, s * .9);
	x.closePath();
	x.clip();
	for (let yy = 0; yy < s; yy += 26) for (let xx = 0; xx < s; xx += 26) {
		x.fillStyle = "rgba(24,40,86,0.55)";
		x.fillRect(xx + 5, yy + 5, 17, 17);
		x.fillStyle = "rgba(210,216,226,0.5)";
		x.fillRect(xx + 5, yy + 12, 17, 1);
	}
	x.restore();
	const tex = new three.CanvasTexture(c);
	tex.colorSpace = three.SRGBColorSpace;
	tex.anisotropy = 8;
	solarCache = withSheen(new three.MeshPhysicalMaterial({
		map: tex,
		color: "#ffffff",
		roughness: .06,
		metalness: .1,
		transparent: true,
		envMapIntensity: 1.4,
		side: three.DoubleSide,
		depthWrite: false
	}));
	return solarCache;
}
/**
* The surfaces are shared: every call for oak at the same scale, in any dome, gets the
* same material. A dome that asked for a new one each time had nearly two thousand, and
* every one of them cost the graphics card its own work.
*/
const surfaces = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
function surface(key, make) {
	let s = surfaces.get(key);
	if (!s) surfaces.set(key, s = make());
	return s;
}
const k2 = (v) => Math.round(v * 20) / 20;
/**
* The lawn: the grass texture laid down in world space, about three metres to a
* tile, so it never stretches whatever shape the ground is; and a slow drift
* of lighter and darker patches over tens of metres, so no two stretches of
* meadow look the same.
*/
let meadowCache = null;
function meadow() {
	if (meadowCache) return meadowCache;
	const mat = new three.MeshStandardMaterial({
		map: grass(),
		roughness: 1
	});
	mat.onBeforeCompile = (sh) => {
		sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vGround;").replace("#include <uv_vertex>", "#include <uv_vertex>\nvec4 gp = modelMatrix * vec4(position, 1.0);\nvGround = gp.xz;\nvMapUv = gp.xz / 3.2;");
		sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vGround;").replace("#include <map_fragment>", "#include <map_fragment>\nfloat drift = texture2D(map, vGround / 61.0).g * 0.6 + texture2D(map, vGround / 23.0 + 0.3).r * 0.4;\ndiffuseColor.rgb *= mix(0.78, 1.18, drift);");
	};
	mat.customProgramCacheKey = () => "meadow";
	return meadowCache = mat;
}
/**
* The surfaces a dome is made of. The painted ones are painted when first asked for (the flagstone, the solar glass,
* the meadow): a sofa or a lantern on its own then paints only what it is made of, not the whole dome's, which made
* every dome-room thing take about three seconds to build from cold.
*/
