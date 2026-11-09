# 8823eb7c · the Mac look (c9): the four vehicles in the asset viewer

Intent 8823eb7c fixes two faults the CPU found (`play/site/scripts/census/viewer.ts`): seven machines the box could not
build (their sources picked by play's version number from a version list of their own: new asset versions, proposed on
play) and nine that threw at their first draw (a node material's program given another build's uniforms: the kit,
`play/site/src/lib/content/render/nodes/index.js`, PR #2206). This job looks at four of them on the Mac's GPU, as
Samuel sees them: **Pickup, Fiat 500 F, City bus, Delivery van**.

**On the Mac**, on this branch (`intent-work/8823eb7c-render`: the fix's code and this job), from the repository's root:

```sh
export PLAY_MCP_TOKEN=…                    # an admin's play token (sent to play only, by the read-only proxy)
bash intent-work/8823eb7c-render/run.sh ~/8823eb7c-look
```

It serves this branch's site with the **dev server** (`vite dev`, port 5191) against play read-only
(`play/site/scripts/macjob/proxy.mjs` on 3911), opens each at `/machines/#<uuid>` in Chromium on Metal, waits until the
viewer shows it or says why not (`window.__vaultAsset`), keeps its console errors and a screenshot.

- **Out:** `~/8823eb7c-look/{pickup,fiat500,citybus,deliveryvan}.png`, `report.json` (the renderer, each asset's
  verdict, error and console errors), and the line **LOOK PASSED** or **LOOK FAILED**.
- It prints the renderer: if it is not Metal (ANGLE … Metal), stop and say so.
- **Passes** when all four are shown, no "Not shown" note, no uniform/texture/WeakMap/"no asset" error in the console;
  each screenshot shows the vehicle whole and painted, as on its card.
- **Before Accept** the viewer shows each asset's newest *accepted* version: the City bus and the Delivery van show
  the kit's fix; the Pickup and the Fiat 500 F show their fixed versions only once the intent is accepted (until then
  they still say "Not shown … no asset machines/…@2", which is the fault this intent's asset versions fix). So run it
  after Accept for all four, or now for the bus and the van.
- **Send back** (to the 8823eb7c builder session or the Orchestrator): the LOOK line, `report.json`, and the four
  screenshots.

**Dry run** (avenBOX, CPU, no GPU; play/site/scripts/macjob/README.md):

    bun play/site/scripts/macjob/dry.ts intent-work/8823eb7c-render --at <this branch's commit>

The asset viewer is a route the census does not build, so in the dry run each page is empty and its wait times out
(the job tolerates it: it reports and ends 0); it proves the plumbing, never the pictures.
