// The character's renders, on a real GPU only (Samuel's Mac, Metal through Chrome): never in the cloud on SwiftShader.
//   node render-gpu.mjs <scene.json>… -> <scene>.png beside each scene (from scene.textured_scene: textured, eyes)
import { createRequire } from "node:module"; import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs"; import { dirname, resolve } from "node:path";
const { chromium } = createRequire(new URL("../../play/site/package.json", import.meta.url).pathname)("playwright");
const THREE = new URL("../../play/site/node_modules/three/build/", import.meta.url).pathname;
if (process.platform !== "darwin" && !process.env.RENDER_ANYWHERE) { console.error("GPU renders run on the Mac (Metal), not here."); process.exit(1); }
const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--window-size=1100,1100"] });
const page = await browser.newPage();
await page.route(/http:\/\/r\/.+\.js$/, (r) => { const f = new URL(r.request().url()).pathname.slice(1); r.fulfill({ body: readFileSync(THREE + (f === "three.js" ? "three.module.js" : f)), contentType: "text/javascript" }); });
await page.route(/http:\/\/r\/tex\/.+/, (r) => r.fulfill({ body: readFileSync(decodeURIComponent(new URL(r.request().url()).pathname.slice(5))), contentType: "image/png" }));
await page.route("http://r/", (r) => r.fulfill({ body: "<html><body style='margin:0;background:#f2f2f2'></body></html>", contentType: "text/html" }));
await page.goto("http://r/");
console.log("renderer:", await page.evaluate(() => { const g = document.createElement("canvas").getContext("webgl2"); const d = g.getExtension("WEBGL_debug_renderer_info"); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?"; }));
for (const path of process.argv.slice(2)) {
  const s = JSON.parse(readFileSync(path, "utf8"));
  if (s.tex) s.tex = "http://r/tex/" + encodeURIComponent(resolve(dirname(path), s.tex));
  const png = await page.evaluate(async (s) => {
    const T = await import("http://r/three.js"); const W = s.size[0], H = s.size[1];
    const r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setPixelRatio(2); r.toneMapping = T.ACESFilmicToneMapping;
    document.body.innerHTML = ""; document.body.appendChild(r.domElement);
    const cam = new T.PerspectiveCamera(s.cam.fov, W / H, 0.05, 200); cam.position.set(...s.cam.pos); cam.lookAt(...s.cam.target);
    // per-corner UVs: one vertex per triangle corner
    const n = s.tris.length, P = new Float32Array(n * 3), UV = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const v = s.tris[i]; P.set([s.pos[3 * v], s.pos[3 * v + 1], s.pos[3 * v + 2]], 3 * i); if (s.uvt) UV.set([s.uvt[2 * i], s.uvt[2 * i + 1]], 2 * i) }  // OBJ's v is up, as three's with flipY
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(P, 3)); if (s.uvt) g.setAttribute("uv", new T.BufferAttribute(UV, 2));
    // smooth normals: computed on the shared vertices (indexed), then handed to every corner (no facets at UV seams)
    const gi = new T.BufferGeometry(); gi.setAttribute("position", new T.Float32BufferAttribute(s.pos, 3)); gi.setIndex(s.tris); gi.computeVertexNormals();
    const VN = gi.attributes.normal.array, N = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = s.tris[i]; N.set([VN[3 * v], VN[3 * v + 1], VN[3 * v + 2]], 3 * i); }
    g.setAttribute("normal", new T.BufferAttribute(N, 3));
    const sc = new T.Scene(); sc.background = new T.Color(0xf2f2f2);
    let map = null; if (s.tex) { map = await new T.TextureLoader().loadAsync(s.tex); map.colorSpace = T.SRGBColorSpace; map.flipY = true; map.anisotropy = 8; }
    sc.add(new T.Mesh(g, new T.MeshStandardMaterial({ map, color: map ? 0xffffff : 0xd8b8a0, roughness: 0.62 })));
    for (const e of s.eyes ?? []) {  // a simple eye: sclera, iris, pupil and the catchlight (actor-skill: the friendly glint)
      // the ball, and on its front the iris and the pupil as caps of slightly larger spheres (on the surface, never in it)
      const cap = (r, angle, mat) => { const m = new T.Mesh(new T.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, angle), mat); m.rotation.x = Math.PI / 2; m.position.set(e[0], e[1], e[2]); sc.add(m); };
      cap(e[3], Math.PI, new T.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.25 }));
      cap(e[3] * 1.004, 0.50, new T.MeshStandardMaterial({ color: s.irisColor ?? 0x6f8a9c, roughness: 0.35 }));
      cap(e[3] * 1.008, 0.19, new T.MeshBasicMaterial({ color: 0x0d0d0d }));
      const glint = new T.Mesh(new T.SphereGeometry(e[3] * 0.06, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(e[0] + e[3] * 0.18, e[1] + e[3] * 0.2, e[2] + e[3] * 0.97); sc.add(glint);
    }
    sc.add(new T.HemisphereLight(0xffffff, 0x8a7060, 1.2));
    const key = new T.DirectionalLight(0xfff4e8, 2.4); key.position.set(4, 6, 10); sc.add(key);
    const fill = new T.DirectionalLight(0xe8f0ff, 0.8); fill.position.set(-8, 2, 6); sc.add(fill);
    r.render(sc, cam); return r.domElement.toDataURL("image/png");
  }, s);
  writeFileSync(path.replace(/\.json$/, ".png"), Buffer.from(png.split(",")[1], "base64")); console.log(path.replace(/\.json$/, ".png"));
}
await browser.close();
