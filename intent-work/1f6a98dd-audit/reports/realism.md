## A — Is production's grass thinner? No: by blade count it is the densest it has been. What looks thin is elsewhere.

**History of the number** (`play/site/src/lib/content/biomes/grass.js` `DEVICES`, now lines 69-72):

| When | Commit | Desktop near density | Stands full out to | Falloff | Why |
|---|---|---|---|---|---|
| 2026-11-09 18:07 | 2099cedbf | 120 → 180 /m² | 6 m | 1.8 | "the spec's 120–200, so a colony reads dense" |
| 2026-11-09 18:08 | e72bc8e03 | 180 → 150 /m² | 6 m | 1.8 | 180 took Sandbox 1's mid view past its triangle bound; shipped as #2183 (4417092b7) |
| 2026-11-09 21:40 | 683c2bbd8 | 700 /m² | 2.5 m | 2 | Samuel: "tufts of ten a square metre read as a sprinkle". Census vs main: tris +2.83 % near, +3.84 % mid (bound 4.5 %; 800/m² gave +4.49 %), +0.70 % far |
| 2026-11-10 08:10 | 18d0a174c (#2224, e85a5860) | 700 /m² | 4 m on WebGPU | 2 | Blades chosen in compute, three indirect draws; each blade drawn 3× as wide as it stands (`grass-gpu.js:361`) |
| 2026-11-10 | 0320c53fc (5fe91a2f) | phone on WebGPU 400 /m² | 3 m | 2 | Phone drawn 6× wide; WebGL 2 fallback phone stays 260 /m², 1.9 m |

- **Mesh and bands:** a blade is 13 / 5 / 2 triangles (15 / 7 / 4 vertices) in bands 0–8 / 8–25 / 25–70 m on desktop, 0–5 / 5–15 / 15–35 m on a phone (`grass.js:14-16, 55, 70-71`).
- **Thinning** is `(near/d)^2` (`grass.js:147-153`). COMPUTED on desktop WebGPU: 700 /m² to 4 m, 175 at 8 m, 18 at 25 m, 2.3 at 70 m. The shipped 150 profile gave 89 / 11.5 / 1.8 at the same distances, so today is denser at every distance.
- **Blades standing in the full circle** (COMPUTED from `capacities`, `grass-gpu.js:270-283`, before frustum cull):
  - desktop WebGPU: about 244k blades, 1.66M triangles;
  - desktop fallback: 108k blades, 0.82M triangles;
  - old 150 profile: 125k blades, 0.68M triangles;
  - phone WebGPU: 69k blades (the code's comment says "83k room").
- **Coverage measured in the repo** (`grass-gpu.js:353-360`): meadow near view 90.4 % covered at 1280×720 on the WebGPU profile, against 57 % with the fallback numbers; phone 88.5 % against 53.5 %.
- **Where blades stop:** a jittered circle at 0.9–1 × 70 m (35 m on a phone), fading over the last 6 m (`grass.js:176-178`). Beyond is only the ground shader.
- **Other ground cover stops much sooner:**
  - the floor biome's cover stream has reach 28 m, near 7, thin 0.2 (`sandbox-2/interior/village.ts:998`);
  - the garden's shrubs are put down to 26 m and its cover-layer plants to 13 m (`flora.js:23` `STREAMS.village`; 40 / 22 m under a dome);
  - small plants have no picture and are left out past it (`drawn.js:69`).

**Why it still reads "not dense"** (SEEN, Mac WebKit on WebGPU, production eadbf2f7):
- Grass stands only in colonies (`PATCH = [0.04, 0.4]`, `grass.js:161`), with bare brown litter between.
- Blades are few, wide, straight dark-green spikes of one species and one height class. There are no seed heads, no flowers and no dry thatch.
- In the far view the whole foreground meadow is a flat brown-green texture with no blade at all; the forest starts as a wall behind it.
- The 090168c8 branch pictures (SwiftShader, 960×600) show the same character at 150 and at 700 /m²: more spikes, still tufts on bare soil.

**Skill against main:** biome-skill line 68 still says "150 a square metre near … a small device … at 70"; main is 700 / 400 / 260. The skill's own look targets fail in the Mac pictures: "dense … no edge where the blades end" (line 87) and "colonies, not confetti".

## B — Is the forest thinner or poorer at distance?

**(1) Far trees on main** (`assets/render/impostors.js`, `render/nodes/index.js:270-293`, `lod.js`), CODE:
- The last level is one upright card (2 triangles) showing a picture from 8 sides around the vertical axis only (`FRAMES = 8`).
- The picture is taken in a studio light (ambient plus a front key plus RoomEnvironment), so its lighting is baked in. The card is then lit with one fake normal, "facing the eye a little upward" (`index.js:291`), so there is no sunlit or shaded side.
- Views switch hard (`floor(angle/step + 0.5)`, `index.js:277`), with no blending, so a tree pops as you walk round it.
- Resolution is 128 px a side on desktop and 80 px on a phone (`budget.js:59-60`).
- A plant's picture takes over at 0.22 of view height (`lod.js:20`, `index.js:288-295`): a 12 m tree at about 40 m, a 30 m pecan at 43 m (`DENSITY = 0.2`, `lod.js:112`). At 1080 px that is about 238 px on screen from a 128 px picture, so it is magnified about 1.9× the moment it appears.
- Cards cast an outline shadow and are cut with alphaTest 0.5.
- Anything under 0.002 of the view is not drawn (`SMALLEST`, `lod.js:34`; `index.js:958`).
- Shrubs and cover have no picture: they vanish at 26 / 13 m.

**What the reverted version did** (3a8b135a, #2196, be5126bd9): hemi-octahedral 6×6 views at 96 px (48 px on a phone); unlit colour plus normals plus depth; the three nearest views blended; lit by the scene's sun and sky; a top-down far-canopy shadow map (`render/nodes/canopy.js`, now gone from main).

**Why it was reverted** (da46ab042 / 672ae5797, #2238, intent ffd02ebf): the bisect's culprit. It baked about 180 kinds at load and production hung at "Growing the forest" (Sandbox 5 at 170 of 180 kinds after 549 s; Sandbox 1 at 190 of 198). Reverted, Sandbox 5 showed at 265 s. The three-performance skill, lines 62-63, still describes the reverted impostors and `canopy.js` as if they were live.

**(2) Planting and caps.**
- Counts come from the sandbox config `garden` (`sandbox5.js:29-50`: `spacing`, `drift`, `fields`), laid by `village.ts:802-960`. The actual spacing values live in play's database; I did not read them.
- I found no commit in the last 10 days that reduced copies or added a per-kind cap or a maximum draw distance for trees. Trees stand "however far off (as its picture)" (`flora.js:198`).
- The real change at distance was intent 6295a650 on 2026-11-07 (2d91cb60b, 129cc30c0, 709a84a39): the selector went from `[1.2, 0.28, 0.11]` (a picture past about 85 m) to `[1.2, 0.56, 0.22]` (past 40 m), with a rule that heavy levels hand over sooner. The earlier setting drew 3.3× the far-view triangles. This restored the old village's behaviour; it is not thinner than before that intent.
- 658a50eaa kept the shrub and cover reach at 26 / 13 m; a wider reach had put down about 540 more plants and +53 % far triangles.
- 416c555c (#2250, ead28d28a): I saw only its log titles (buffer uploads, census) and did not read its diff.
- 405f7a85 is not on main. Its Mac summary says its head lost "Sandbox 1's palms and bananas from the far ring".
- Device limits (`budget.js:59-60`): shadow map 4096 / 2048, picture 128 / 80 px, texture 4096 / 1024. Sky: `shadowReach` 300 m, two cascades (`sky.js:228`).
- The post stack on desktop already has SSAO at half resolution, TRAA, bloom, grade, screen-space contact shadows and haze. A phone has none of AO, bloom or contact shadows, and its haze reaches 0.7 (`finish.js:82-97`).

**Mac numbers** (M1 8 GB, WebGPU, 1440×900, dpr 1; `intent-work/405f7a85-render/out/frames/*.json`):

| World | View | Triangles | Draws | Frame | GPU |
|---|---|---|---|---|---|
| Sandbox 1 | near | 3.83M | 1,390 | 51 ms | 24.8 ms |
| Sandbox 1 | mid | 7.18M | 1,966 | 73 ms | 37 ms |
| Sandbox 1 | far | 3.14M | 1,771 | 68 ms | 26.5 ms |
| Sandbox 5 | near | 8.85M | 1,892 | 68.5 ms | 36 ms |
| Sandbox 5 | mid | 10.1M | 1,686 | 45 ms | 40.5 ms |
| Sandbox 5 | far | 4.37M | 1,311 | 30 ms | 25 ms |

Sandbox 1 is CPU-bound in every view. The zero shadow triangles in median frames are the shadow maps not updating while the eye stands still (`shadowStep` 2 m); shadows are visibly there in the pictures.

**(3) The pictures, as a harsh critic** (SEEN: prod Sandbox 1 near / mid / far, Sandbox 5 near / far, Sandbox 3, all WebKit).
- **Grass and cover:** isolated tufts of thick, uniform, saturated spikes on bare litter, each blade a visible flat ribbon. Sandbox 1 near has a cattail of five flat green planks filling the right foreground.
- **Near trees:** leaves are large flat single-colour polygons. Trunks are smooth dark tubes with no bark relief. Crowns are a stippled dither with sky showing through like static.
- **Far trees:** a cut-out frieze. Leaf specks float detached in the sky above the crowns, the red-brown crowns in Sandbox 5 are pure noise, every tree is equally dark with no sun side, and there is no haze separating depth layers.
- **Ground:** one blurred brown-green noise to the horizon with no relief, stones, shadows or grass. Tree shadows are faint grey smudges that end at the wood's edge.
- **Sky:** a flat saturated blue gradient with clouds as stair-stepped rectangles (the known cause).
- **Light:** dappled shadow on the path is good. Everything else is low-contrast with near-black shadow sides in the wood, and there are no highlights on leaves.
- **Water:** an opaque mint-green sheet with no reflection, no ripples, no depth and a hard polygon shore. Sandbox 5 has broken reflection strips where the path meets the pond.
- **Domes and buildings:** the Sandbox 1 dome glass is a repeating blue moiré tile, and the stone is a uniform brick texture with no ambient occlusion in the arches. The Sandbox 5 dome is clean but chalk-white.
- **Sandbox 3:** an empty beige plane with one figure and a blurred blue blob for a shadow; there is no world to judge.

## C — Per part: now, the real thing, the gap, the technique and its cost

**Grass and cover.**
- Now: tufts of wide spikes on bare soil; cover gone at 13–28 m.
- Real (a temperate meadow at noon; biome-skill's own target, lines 47 and 87; Poly Haven `autumn_meadow`): a closed sward with no visible soil, three or four species, pale seed heads above, 10–20 % straw, and a soft fuzzy silhouette against the light.
- Gap: the colony curve leaves soil bare, blades are 3× wide, and there is one blade shape.
- Technique: raise `PATCH` so the sward closes (free). Add a second and third blade type (seed-head stalk, broad leaf) chosen by hash in the same compute, for no extra draws and about 10 % more triangles. Add ground-cover cards from 28 to 120 m, at 2 triangles each.

**Trees near.**
- Now: flat polygon leaves, tube trunks, dither static.
- Real (the plant reference sheets of plant-skill): leaves with a midrib and a gloss highlight, translucent yellow-green when backlit, bark with relief.
- Gap: no leaf normal or translucency map, no bark texture, and alpha-hash noise that TRAA does not resolve in a still.
- Technique: leaf material with transmission and specular (fill cost only); bark from the scanned sets with triplanar mapping (memory about 5–21 MiB per 1024–2048 px set, per three-performance line 85); alpha-to-coverage instead of hash near the eye.

**Trees far.**
- Now: unlit 8-side billboards, 128 px, magnified 1.9×, with floating specks.
- Real: crowns with a sun side and a shadow side, blue-greying with distance.
- Gap: baked studio light, no normals, hard view switching, low resolution.
- Technique: the reverted octahedral impostors, but baked lazily (per kind on first far use, a few per frame, kept in the device cache) or baked offline into play's files. Triangles and draws stay as today; memory is two 2304² pages; the load cost is exactly what hung production and must be spread out. A cheaper step first: 256 px pictures on a 4096 page (4× memory) and a later takeover for the nearest ring.

**The forest as a whole.**
- Now: a wall with no understorey past 26 m and no depth layering.
- Real: a food forest reads as layers — herb, shrub, small tree, canopy — closing to green at eye height.
- Technique: shrubs as pictures out to about 80 m (2 triangles each; 658a50eaa measured that keeping about 540 as shapes cost +53 % far triangles, so use cards, not shapes). Bring back the canopy shadow map for far dapple (one top-down target, re-laid every 30 m or 2 s).

**Sky and clouds.**
- Now: blocky.
- Real: `autumn_meadow` / `evening_field`, with soft cumulus, lit edges and a pale horizon.
- Technique: after the precision fix, two noise layers with sun-side lighting in the sky shader. Fill only, on the 1,984-triangle dome.

**Light, shadow and colour.**
- Now: flat, with dark holes.
- Real: a warm key and cool fill (world-skill line 63), and haze that deepens with distance.
- Technique: height fog and aerial perspective are already in the finish plan; the haze reach and tint need tuning, as none is visible at 100–300 m. Sky-coloured fill in the shade. No new passes.

**Ground.**
- Now: blurred noise at distance.
- Real: the scanned CC0 sets of biome-skill, with relief and litter.
- Technique: a far detail layer at a second UV scale plus a normal map (fill only), and the grass colour field tinting the ground green where grass would stand past 70 m.

**Water.**
- Now: an opaque mint sheet.
- Real: dark and reflective at grazing angles, clear at the shore.
- Technique: Fresnel with sky and environment reflection, depth-based colour, animated normals, and a soft shore by depth fade. One extra depth read; fill only.

**Domes and buildings.**
- Now: moiré glass, flat stone.
- Technique: mip and anisotropy for the glass pattern (or a procedural one), environment reflection on glass, and stronger AO in the arches (SSAO is already running).

**Ranked candidates — one night each, largest visible gain for least cost:**
1. **Close the sward.** Must reach: no soil visible between blades within 10 m in the meadow. Judge prod Sandbox 1 near beside `autumn_meadow`'s foreground.
2. **Haze and aerial perspective tuned.** Must reach: trees at 150 m visibly paler and bluer than trees at 40 m. Judge Sandbox 5 far beside `evening_field`.
3. **Water with Fresnel reflection and depth colour.** Must reach: the pond mirrors sky and dome at a low angle. Judge Sandbox 1 near beside any real pond photograph.
4. **Far pictures sharper** (256 px, blended neighbouring views). Must reach: no pixel blocks or floating specks at the 40 m switch. Judge the Mac's `far-zoom.jpg` crop before and after.
5. **Three blade types and seed heads.** Must reach: the meadow silhouette is fuzzy and mixed, not a comb. Judge mid view beside a meadow close-up.
6. **Leaf translucency and specular.** Must reach: backlit crowns glow yellow-green at a low sun. Judge the sun-at-8° shot beside `evening_field`.
7. **Lit octahedral impostors, baked lazily.** Must reach: far crowns have a sunlit and a shaded side that match the near trees at the same hour, and the load is no slower. Judge far view at noon and golden hour, plus the shown-seconds figure.
8. **Understorey cards to 80 m.** Must reach: no bare-floor band between trunks at 30–80 m. Judge Sandbox 1 mid.
9. **Far ground detail and grass tint.** Must reach: no edge where blades end at 70 m. Judge the far view foreground.
10. **Far canopy shadow map back.** Must reach: dapple continues under distant woods. Judge far view.
11. **Dome glass without moiré.** Must reach: glass reads as glass with a sky reflection. Judge Sandbox 1 near.
12. **Two-layer lit clouds** (after the precision fix). Must reach: soft cumulus with bright sun edges. Judge beside `autumn_meadow`'s sky.

**Not checked:** the garden config's actual spacing values (in play's database), 416c555c's diff, the Chromium pictures, and the 405f7a85 head pictures.