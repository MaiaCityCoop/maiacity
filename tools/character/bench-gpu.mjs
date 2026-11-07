// A character's bench film, on a real GPU only (the Mac, Metal): its recipe built in the page on its pieces (by hash,
// from a local folder), then walk, a turn, sit down, sitting, stand up and wave played with its motion pieces, its
// face friendly throughout and joyful where the schedule says, each frame written as a PNG (frames/0000.png …).
//   bun bench-gpu.mjs <recipe.js> <pieces-folder> <out-folder> [seconds=20] [fps=24]
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const { chromium } = createRequire(new URL("../../play/site/package.json", import.meta.url).pathname)("playwright");
const THREE = new URL("../../play/site/node_modules/three/", import.meta.url).pathname;
if (process.platform !== "darwin" && !process.env.RENDER_ANYWHERE) { console.error("GPU renders run on the Mac (Metal), not here."); process.exit(1); }
const [recipe, folder, out, seconds = "20", fps = "24"] = process.argv.slice(2);
mkdirSync(join(out, "frames"), { recursive: true });
// the recipe and every piece it names, recursively, as sources by hash
const sources = {};
const walk = (src) => { for (const h of src.match(/require\('([0-9a-f]{64})'\)/g) ?? []) { const k = h.slice(9, 73); if (!sources[k]) { const f = join(folder, k + ".js"); if (!existsSync(f)) throw new Error("missing piece " + k); sources[k] = readFileSync(f, "utf8"); walk(sources[k]); } } };
const main = readFileSync(recipe, "utf8"); walk(main);
const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route(/http:\/\/r\/three\/.+/, (r) => { const f = new URL(r.request().url()).pathname.slice("/three/".length); r.fulfill({ body: readFileSync(THREE + f), contentType: "text/javascript" }); });
await page.route("http://r/", (r) => r.fulfill({ body: "<html><body style='margin:0;background:#ece8e1'></body></html>", contentType: "text/html" }));
await page.goto("http://r/");
console.log("renderer:", await page.evaluate(() => { const g = document.createElement("canvas").getContext("webgl2"); const d = g.getExtension("WEBGL_debug_renderer_info"); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?"; }));
await page.evaluate(async ({ main, sources }) => {
  const T = await import("http://r/three/build/three.module.js");
  const addons = { "three/addons/utils/BufferGeometryUtils.js": await import("http://r/three/examples/jsm/utils/BufferGeometryUtils.js"), "three/addons/geometries/RoundedBoxGeometry.js": await import("http://r/three/examples/jsm/geometries/RoundedBoxGeometry.js") };
  const mods = {};
  const req = (n) => { if (n === "three") return T; if (addons[n]) return addons[n]; if (!mods[n]) { const m = { exports: {} }; mods[n] = m; new Function("require", "module", "exports", sources[n])(req, m, m.exports); } return mods[n].exports; };
  const m = { exports: {} }; new Function("require", "module", "exports", main)(req, m, m.exports);
  const r = m.exports.recipe("bench", 1); const built = r.build(...r.meta.params.map((p) => p.value));
  const W = 1280, H = 720, ren = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); ren.setSize(W, H); ren.setPixelRatio(1);
  ren.shadowMap.enabled = true; ren.toneMapping = T.ACESFilmicToneMapping; document.body.appendChild(ren.domElement);
  const sc = new T.Scene(); sc.background = new T.Color(0xece8e1);
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
  sc.add(new T.HemisphereLight(0xffffff, 0x9a8a78, 1.3)); const sun = new T.DirectionalLight(0xfff2e0, 2.6); sun.position.set(4, 8, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); sc.add(sun);
  // a chair to sit on: its seat at the body's seat height
  const seat = new T.Mesh(new T.BoxGeometry(0.46, 0.04, 0.44), new T.MeshStandardMaterial({ color: 0x8a6a4a })); seat.castShadow = true; sc.add(seat);
  const obj = built.rig.object; obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); sc.add(obj);
  const skin = []; obj.traverse((o) => { if (o.morphTargetDictionary) skin.push(o); });
  const cam = new T.PerspectiveCamera(30, W / H, 0.1, 100);
  window.__bench = { T, ren, sc, cam, built, obj, skin, seat, morphs: skin.flatMap((o) => Object.keys(o.morphTargetDictionary)) };
}, { main, sources });
console.log("morphs:", await page.evaluate(() => [...new Set(window.__bench.morphs)].join(", ")));
// the schedule (s): clip, when it starts, and joy (0..1); walk at 1.2 m/s
const S = [["idle", 0, 0], ["walk", 2, 0], ["turn left", 6.5, 0], ["sit down", 8.1, 0], ["sitting", 10.5, 1], ["stand up", 12.5, 0], ["wave", 14.7, 1], ["idle", 17.7, 0.6]];
const N = Math.round(+seconds * +fps);
for (let f = 0; f < N; f++) {
  const t = f / +fps;
  const png = await page.evaluate(({ t, S }) => {
    const { T, ren, sc, cam, built, obj, skin, seat } = window.__bench;
    let k = 0; for (let i = 0; i < S.length; i++) if (t >= S[i][1]) k = i;
    const [name, at, joy] = S[k], local = t - at, speed = 1.2;
    const walked = Math.min(Math.max(0, Math.min(t, 6.5) - 2), 4.5) * speed;
    const pose = built.clips[name](local, name === "walk" ? { dist: local * speed, speed, turn: 0 } : undefined);
    built.rig.pose(pose);
    // where it stands: walked forward along +z, then turned a quarter left for the rest
    obj.position.set(0, 0, walked); obj.rotation.y = t >= 8.1 ? Math.PI / 2 : 0;
    seat.position.set(-0.12, 0.48, walked); seat.visible = t >= 8.1;
    const j = Math.min(1, Math.max(0, joy * Math.min(1, local / 0.6)));
    for (const o of skin) { const d = o.morphTargetDictionary; if ("friendly" in d) o.morphTargetInfluences[d.friendly] = 1 - j; if ("joy" in d) o.morphTargetInfluences[d.joy] = j; }
    const c = new T.Vector3(0, 1.0, walked * 0.85 + 0.6); cam.position.set(c.x + 3.6, 1.45, c.z + 4.2); cam.lookAt(c);
    ren.render(sc, cam); return ren.domElement.toDataURL("image/png");
  }, { t, S });
  writeFileSync(join(out, "frames", String(f).padStart(4, "0") + ".png"), Buffer.from(png.split(",")[1], "base64"));
}
console.log(`${N} frames in ${join(out, "frames")}`);
await browser.close();
