# c929d52c · The sky's clouds are soft, never blocks · round log

Builder's plain log, one entry a round. Code: branch `intent/c929d52c-clouds`, pull request #2254.
Box pictures (`box/`) are the sky alone, drawn by the box's software renderer through `harness/` (WebGL 2 backend,
SwiftShader, 960 × 600 a panel: dawn 5.6, noon 12.5 / afternoon 16, dusk 19.4 / night 23). They decide what the code
decides (blocks or none); the look on a real GPU is the macOS runner's (`gpu/`, added as its runs finish).

## The cause (23:20 UTC, before the spec)

The clouds are noise in the sky's shader, no picture. `sky.js` set `drift = hour · 60`; the shader computed
`(d.xz / (0.55·h) · 0.0002 + drift) · 1000` and per octave `q·2 + drift·300`. At noon: 720 000 cells, then 1.7, 3.5,
7.1 million. A 32-bit float holds 1/16 of a cell at 720 000 and half a cell at 7 million. `harness/f32.mjs` in 32-bit
arithmetic: at hour 12, 200 neighbouring pixels read **one** value (hour 0.5: 15 values; the true span is 0.028 cells).
The game's clock runs 30 × real time and the sky is set once a second, so the drift also moved 500 cells a second: the
clouds never drifted, they were made anew every second.

## Round 0 · main's clouds in the box (23:29)

`box/round0-main.png` (commit d935eef0: the clouds moved to clouds.js, same sums as main). **Large flat blocks with
hard straight edges at every daytime hour**, exactly Samuel's screenshot, in a software renderer: so it is the
arithmetic, not Safari, not Metal, not the WebGPU switch's backend. Chromium must show it too (the runner's before
pictures will say).

## Round 1 · the numbers small (23:29)

Each octave's lattice repeats (16 cells of the first octave), the hour reaches the shader as a fraction of the day,
the day's drift is a whole number of periods (midnight joins). Five octaves; a coarse second sample toward the sun for
shade. First try had a NaN constant (a node multiplied by a JS number): the box's shader compile said so, the unit
tests did not. `box/round1.png`: **no blocks, soft edges.** As a critic: flat lavender-grey smears, darker than they
should be by day, no depth; a pale wash round the noon sun.

## Round 2 · light (23:30)

Brighter sunlit part, tighter rim toward the sun, firmer bodies (opacity rises faster with depth), a little more fine
detail. `box/round2.png`: reads as clouds now; interiors still one flat tone, edges smooth and blobby.

## Round 3 · seen from below (23:31)

A cumulus from the ground has a grey base and bright thin edges: brightness by thinness, the middles grey; the plane
bent by the slow octave so no outline runs along the lattice. `box/round3.png`: bodies with a grey middle and a light
edge, broken small clouds toward the horizon, thinning into the haze; night: faint dark shapes against the stars.
Honest: these are good stylised fair-weather clouds, **not yet photographic**: the outlines are still rounded noise
(no cauliflower tops, no wisps), and one layer has no parallax.

`box/round3-phone.png`: round 3 at 390 × 844 (dawn, noon, dusk, night): soft at a phone's size too.

## Round 4–5 · billows (23:34)

The fine three octaves billow (|noise|: round bulges, sharp creases between them) on the two coarse octaves' bodies.
Round 4 broke the clouds into scattered puffs (the billows' mean was below zero and ate the bodies); round 5 centres
them. `box/round5.png`: outlines now have lobes and bays like a cumulus seen from below, and small clouds break off
the big ones. Still one flat tone inside by day.

## 23:33 · Samuel's word, relayed by the Orchestrator

"We still need absolute realism, high quality screens", and no before-against-after: main's sky is what he finds bad.
So the pull request shows the result alone, judged against real skies, one honest line a picture. References I judge
against (from knowledge of such photographs, none fetched): fair-weather cumulus humilis from the ground at midday
(white sunlit rims, flat blue-grey bases, crisp lobed tops, rows flattening into haze at the horizon); the same field
ten minutes after sunrise or before sunset (bases and sun-facing sides rose to orange, far sides slate-blue, the sky
behind still blue overhead); a moonless night with broken cloud (dark shapes that hide stars, no light of their own).

## Round 6–7 · the sun's own colour (23:38)

At this sky's dawn and dusk (sun 4° up; the first --sky hours, 6.6 and 17.4, were mid-morning and afternoon: fixed to
5.35 and 19.65) the clouds stayed grey-white: they were lit by the air's extinction along the *eye's* line, not along
the sun's. Now `airOf` works out once a move what is left of the sun where the clouds are (Preetham's extinction along
the sun's path) and a low sun also lights the bases. `box/round7.png`: **rose clouds at dawn and dusk with slate
shadows, white at noon.** Against the references: colour and softness right; dawn clouds are evenly rose where a real
field goes from orange near the sun to grey away from it; noon bodies still lack a firm bright rim against a darker
base; one layer, no parallax; no cirrus above.

## Round 8 · rim and base by day (23:36)

Darker bases, the shade taken from further toward the sun, a little more light. `box/round8.png`: the noon clouds'
edges are whiter than their middles now; modest.

## Round 9–10 · glow toward the sun; a veil tried and dropped (23:37)

A cloud between the eye and the sun glows, one opposite the sun is lit from the front, those to the side least
(`box/round10.png`). A thin high veil of streaks (two more noise reads) was tried in round 9: it hardly showed, so it
is out again; nothing is kept that does not show.

## Round 11 · the drift (23:38)

In the box: from one of the sky's once-a-second sets to the next the picture changed at cloud edges by a pixel or two
(mean 1.3 of 255 in red, peaks 77): a tick you would see. The wind is now set every frame (one number), the sky's
light still once a second. A cloud crosses a cell (about 300 px, 30° up) in three real minutes: slow, visible.
Midnight (23.999 → 0.001): no jump in the clouds (the day's drift is whole periods).

## How long a GPU round is (23:38)

One world in one browser is six to seven minutes on the macOS runner (play/SPEC.md §4.12); the spec's two GPU checks
load Sandbox 1 four times: **about 27 minutes a GPU round**, not five. So: the box's harness for every change (seconds),
the runner for what only a GPU shows (both engines, Metal, the whole world under the sky), few rounds.

## What real clouds would take (for a next intent, Samuel's to decide)

This intent's clouds are **one flat layer**: a density on a plane, lit by two cheap tricks (a second coarse sample
toward the sun; brightness by thinness). That gives soft lobed outlines, a believable colour through the day and
slow drift, for 8 noise reads a sky pixel (main: 5). What it cannot give:

1. **Volume and parallax** (towers, a cloud's side seen as you walk under it, shadows of one cloud on another).
   Needs a slab marched along the eye's ray: 16–32 steps of a 3D density, each with 4–6 steps toward the sun. Read
   from noise worked out per step that is some 300–800 noise reads a pixel; with two small 3D textures (a 128³ shape
   and a 32³ detail, built once, about 2 MB of GPU memory) it is 100–200 texture reads. On a phone that is a pass of
   its own at half or quarter resolution, spread over frames (one sixteenth of the pixels a frame, the rest
   reprojected), then laid over the sky: one more render pass, a history texture, and care at the horizon and behind
   trees. An order of 1–2 ms a frame on an M1 at 1440 × 900, more on a phone; it must be measured on Samuel's Mac.
2. **Clouds that shade the land** (their shadows drifting over the forest): the sun's light times the same density
   where the sun's ray meets the layer; one more texture read in every lit material, so it touches the world's
   materials, not only the sky.
3. **The sky's light following the clouds** (a greyer world under a grey sky): the environment is baked without
   clouds today; with them it must be baked again as they move.
4. **Weather** (cover and kind changing by the day: cirrus, stratus, towering cumulus, rain): a cover that is data of
   the world, not a constant of the sky.

Each is its own intent; 1 is the one that makes a screenshot read as a photograph.

## GPU run 0 · main's sky, only --sky added (run 42923117215, 23:24–23:47)

- c3: **killed at the check's 600 s** (`exit 124`): Chromium (WebGPU on Metal, adapter apple) showed Sandbox 1 in
  238.7 s, 0.953 painted, 104.7 ms a frame (CPU 58.1, GPU not reported), then WebKit ran out of time. Main's own.
- c5 (--sky): Chromium's eight pictures only, and they show **no sky**: the eye was turned up, but Sandbox 1 opens
  facing the master dome (`gpu/run0-main-chromium-noon-dome-hides-sky.png`). The hour is pinned rightly
  (`gpu/run0-main-chromium-phone-hours.png`: day, day, day, night with stars; the first hours 6.6 and 17.4 were not
  dawn and dusk). So main's blocks are not on a runner picture; the reference for them is `box/round0-main.png`
  and Samuel's screenshot.
- The runner tells no GPU time and its frame is CPU-bound: **the clouds' cost cannot be read there.** What is known:
  8 noise reads a sky pixel against main's 5, no texture, no extra pass, one number written a frame.

## GPU run 1 · the new clouds, two engines side by side (run 42926538011, 23:49–00:12)

I let gpu.ts load both engines at once when no time is bounded, to fit the ten minutes. **Worse: neither engine
showed the world in 600 s** (a 3-core VM growing two forests). c1, c2, c4 green on GitHub's box (universe.js 335 → 314
lines; clouds.test.js 5 tests; the site's gate 343 s). Then the Orchestrator's word (00:07): the ten minutes are
intent d3f98bcc's, landing in the morning; nothing in this pull request goes round them. The side-by-side change is
out again (57569d6d); kept: the sky's pictures from 45 m up, turned away from what the world faces.

**So tonight c3 cannot be green on the runner, and this intent cannot reach Proposal by its recorded run until
d3f98bcc has landed and the box's run is re-run.** Chromium's sky pictures do fit (world 239 s + settle + 8 shots);
WebKit's wait for d3f98bcc.

Lighter --sky, for whoever specifies next: the sky needs no grown forest. Its pictures could be taken in a world that
shows in seconds (the asset viewer's stage draws this same sky with `clouds: 0.25`; Sandbox 3), or on a page that
draws the sky alone, as `harness/` does in the box in under a minute for five hours. This intent's `run` names
Sandbox 1 and stays as approved.

## The loop (Samuel, 00:07: "max 5 min roundtrips")

Every change is looked at in the box's sky-alone harness: one engine, under a minute. The runner's two-engine check
is not a loop: once per finished head.
