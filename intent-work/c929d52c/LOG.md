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

## Round 12 · a field, not a few big clouds (00:15)

The first octave's cells a little smaller (freq 0.5 → 0.8): more clouds across the sky, rows of small ones flattening
toward the horizon as a real field of fair-weather cumulus does. `box/round12.png`, `box/round12-phone.png` (390 ×
844: dawn, noon, dusk, night). Against the references: the noon picture at a phone's size is the closest yet (lobed
white tops, grey undersides, rows into the haze); dawn and dusk read as rose cumulus but stay evenly tinted; night is
right in kind (dark shapes hiding stars). Still one layer, no parallax.

## 00:31 · ready for review

The dry run on round 12's head (42929739294) was cancelled two seconds after it began, by the run my own push
started in the same concurrency group: dispatch after the push's run has started, not before. And a dry run uses the
branch's own intent.ts (600 s), which this branch may not take from main. d3f98bcc is live on main (00:30): a gpu.ts
check now has 1,500 s in the recorded run, which runs main's intent.ts. So the pull request is marked ready at
0913267d: its run measures c1–c5 in full and records them. c1 and c2 pass in the box on that head; the site's 76
type errors are all in files this pull request does not touch.

## 00:58 · conflict with main, resolved (5be34cf3)

play posted "Merges with main" failed: play/SPEC.md. d3f98bcc and this intent each added to the same sentence on
gpu.ts; kept both (main's limits, then --sky and the clouds' rule). Sky tests 26, gpu.ts's 4, d3f98bcc's limit test 3:
green. The push cancelled the recorded run on 0913267d (42932098518), which had not finished; a ready pull request is
run and recorded again on its new head.

## GPU run 2 · the recorded run on 0913267d (42932098518, 00:32–00:57): first pictures on Metal, both engines

c3 passed: Chromium (WebGPU on Metal) world in 226.1 s, 36.8 ms a frame, 0.97 painted; WebKit 26.6 (WebGPU) world in
283.2 s, 348.1 ms a frame, 0.902 painted. The sky's 16 pictures: `gpu/run2/` (`*-desk.jpg`: dawn, noon / dusk,
night at 1440 × 900; `*-phone.jpg`: the four at 390 × 844; and each picture whole).

As a critic, against the references:
- **No blocks, no straight edges, no steps, no bands, in either engine, at either size.** Chromium and WebKit draw
  the same sky.
- **Noon:** a field of white fair-weather cumulus, lobed, thinning into rows at the horizon: the closest to real.
- **Dawn, dusk:** rose clouds over a warm band at the horizon, the blue deep overhead. The large ones read as brush
  strokes (smeared along the bent plane) rather than puffs; a real field there is orange near the sun, grey away.
- **Night:** stars, the clouds barely visible (dark on dark, as they are on a moonless night, but faint).
- **Phone:** the same, soft at 390 × 844.

## 01:30 · the recorded run on the merged head (42935512813): c3 red, WebKit's screenshot

c1, c2, c4 green. c3 red: WebKit showed the world (334 s, 40 frames in 10 s, 263.5 ms each) but Playwright's
screenshot timed out at 30 s, in c3 and in c5. Not this change: 5be34cf3 differs from 0913267d (both engines green
above) only by main's d3f98bcc files (intent.ts, the workflow, the spec); nothing that draws. WebKit on that
paravirtual GPU draws 3–4 frames a second, and a screenshot waits for one. Its failed jobs re-run once (01:33).

## 01:33 · the re-run, and the cost (round 13–14)

The re-run of failed jobs only re-ran the recording job (the GPU job had passed as a job, recording a failing check),
so it recorded the same red; a whole re-run was started, then superseded by the push below.

**The cost.** Against #2256's run (42934313267: main's sky plus that intent's load path) WebKit drew Sandbox 1 at
91.6 ms a frame; with these clouds 263–348 ms. Not a clean comparison (other code, both still loading), but a warning.
In the box, the sky alone at 1440 × 900 with each frame forced to finish (`harness/skyview-time.mjs`):

| sky | ms a frame (software) |
| --- | --- |
| main | 211–238 |
| round 12 | 306 |
| each noise cell wrapped once | 293 |
| + the shade from one octave toward the sun | 286 |
| + four octaves, not five (dropped: blobby edges) | 273–279 |
| + skip the fine octaves where no cloud can be (dropped: nothing saved) | 294–296 |

With the clouds turned off, mine still costs about 290 and main about 225: this renderer works out every branch,
so it measures the shader's length, not what a GPU spends. Kept: the first two (1a8caf6e, `box/round14.png`, the
same look). The skip used the noise's true range (`harness/range.mjs`: −1.256…1.209 over every octave's whole period).

**Not met, said plainly:** the intent's "no more of a frame's time than the sky costs today" is not shown. The sky's
shader is about 1.25 times main's in length. Its time on a GPU is not measured: GitHub's runner reports no GPU time,
and its frames are the CPU's. Samuel's Mac (the frame meter, `render/meter.js`) is the place to measure it.

## 02:09 · the head's recorded run (1a8caf6e, 42940472604): c1–c4 green

c3 green in both engines: Chromium world in 273 s, 81.2 ms a frame, 0.956 painted; WebKit world in 332.6 s, 300.5
ms a frame, 0.963 painted. c5's pictures: Chromium's eight (`gpu/run3/`: the same look as run 2: soft, no blocks,
no edges, no bands, at both sizes); WebKit's screenshot timed out again in c5 (world in 266 s), as on 5be34cf3: the
runner, which in the same run photographed WebKit's world in c3. A dry run of the head (records nothing, so c1–c4
stand) is retaking WebKit's sky pictures, to judge c5 in both engines on the head itself.
