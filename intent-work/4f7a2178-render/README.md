# Mac job: intent 4f7a2178, the Old City film in Safari (c10, a look; nice, not a must)

**What to show.** Story 55b69416 v2, "Old City · the jam at dusk", 16 s, four world shots of the Old City (asset
43420c0b v8 `9bb90d4c…`). It should play in **Safari (WebKit, Metal)** from its first shot to its last:
- the world drawn in every shot, with no "Load failed";
- each cut (4 s, 7.5 s, 11 s) landing on the next shot's own camera;
- the cars moving on across each cut, never jumping back.

**The code:** pull request #2175, branch `intent/4f7a2178-old-city-plays`. Every must check passed in avenBOX on the
CPU. This job is the only one that needs a GPU.

## How

1. `git fetch origin intent/4f7a2178-old-city-plays && git checkout FETCH_HEAD`, then `cd play/site && bun install`.
2. Make the composition as the Stories player does, with the world handed in:
   - compose: `compose(story, {}, {}, {}, { [V8]: oldCity() })`, where `src/lib/stories/old-city.test.ts` shows how to
     build `oldCity()` and the story from the kept fixtures (`src/lib/stories/fixtures/stories/55b69416-….json`,
     `fixtures/worlds/9bb90d4c…/`);
   - harness: `scripts/story-parity.ts --serve` already serves a composition sealed in play's frame, the page handing in
     the files (the frozen engine from `static/engines`, the live runtime from `static/live/live-runtime.js`, every
     other file from play with PLAY_MCP_TOKEN, sent to play only). Hand it the `worlds` argument as above;
     `story-parity.ts` doesn't pass `worlds` to `compose` today.
3. Open the harness in **Safari** and in Playwright's **WebKit**. Wait for `window.__hf.buildReady` (the build takes
   about 20–40 s), then `player.seek(t)` and screenshot at t = 0.5, 3.95, 4.0, 7.45, 7.5, 10.95, 11.0, 15.5.
   Screen-record one play from 0 to 16 s.
4. Put them in `intent-work/4f7a2178-render/out/`:
   - the PNGs;
   - `film.mov`;
   - `NOTES.md`: the browser and its version, how long the build took, any console error, and the meter's line
     (`render/meter.js`: draw calls, triangles, frame_ms, bound) at 4.0 s and 11.0 s.
5. Commit with `Intent: 4f7a2178-3397-4976-a921-acd9954480b3` and push this branch.

**Judged against the spec:** at 3.95 s against 4.0 s, and the same at the other two cuts, the cars stand one frame
further on, not back where they started. Each first frame after a cut shows that shot's own first camera
(fov 38, 35 and 45 at 4, 7.5 and 11 s).
