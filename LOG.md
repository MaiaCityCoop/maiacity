# Intent 31c61d30: sweet chestnut, hazel and moringa within play's 300,000 (builder log)

avenBOX, 2026-11-11. Spec approved, built from intent 3e27d730's drafts (its variants 1985–1987, replayed edit by
edit, each message kept and marked "drafted for intent 3e27d730"), then finished here. No call to fal.

Variants proposed: chestnut **1992** (→ v7), hazel **1993** (→ v6), moringa **1994** (→ v4).

## Play's count (c1): `play/site/scripts/census/ceiling.ts … --intent 31c61d30-…`, main 85a78610

| tree | finest, every stage (default seed) | Main before | card `lod.tris` (most of 7–8 seeds) |
|---|---|---|---|
| chestnut v7 | 284,915 (stage 5, flowering) | 1,528,360 (v6, stage 12) | 290,297 |
| hazel v6 (tree) | 276,339 (stage 12) | 1,032,338 (v5, bush, 12) | 294,590 (bush 'e', 20 y) |
| moringa v4 | 235,229 (stage 9) | 819,380 (v3, stage 9) | 256,604 |

Exit 0, three `ok … → v` lines. Hazel's bush breed (c2) is not built by ceiling.ts's `--intent` (one recipe, the
default breed): counted in node with `count.cjs` (card.js `trianglesOf`'s count, stage by stage in the census's order)
over seeds maia, oak, river, c–f: bush at most 294,590 (seed e, stage 12), 272,002 for maia; tree at most 276,339.

## What changed beyond the drafts

- **Chestnut stages 5–6 were over** (302,837, the flowering tree's catkins 112,571 of it; the draft's table began at
  stage 9): a catkin on the tree is walked in 4 steps, not 5 (up close 24 as before). Now 284,915 (at most 290,297
  over seven seeds).
- **Chestnut nan-check:** v6 had 32,762 normals of no length at every leafy stage (v5 mended only stages 10–12); the
  draft still had 16/54 at stages 2–3. Every stage is mended now: nan-check clean at every stage. Hazel and moringa clean.
- **L2 at detail 0.2, not 0.1, for all three** (c3, below).
- Each card: `lod: { levels: 'declared', tris }`.

## Levels framed where the worlds hand over (c3)

Own bench (`page.html`, `serve.ts`, `shoot.cjs`: the source built in headless Chromium, SwiftShader, one light set for
every shot), because play's render bench (`scripts/render.mjs`) fails on main today: "recipe … can't be built yet:
play's catalog is not loaded (loadRecipes)", with or without `--play` (for its own intent). Each picture: the tree at
about a fifth of the view, cropped and doubled, **L0 | L1 (0.25) | L2 at 0.1 | L2 at 0.2**.

- `chestnut/chestnut-s9-fifth-levels.jpg` (ripe, 10 y): L1 holds; at 0.1 the crown thins to twigs with leaves
  between; at 0.2 (71,389) full and green as L0.
- `chestnut/chestnut-s12-fifth-levels.jpg` (50 y): all four alike, L0 itself see-through (below).
- `hazel/hazel-s9-fifth-levels.jpg`, `hazel/hazel-s12-fifth-levels.jpg`: at 0.1 the crown thins and paler; at 0.2
  (23,311 / 26,101) as L0.
- `moringa/moringa-s9-fifth-levels.jpg`, `moringa/moringa-s8-fifth-levels.jpg`: at 0.1 the hanging pods vanish and the
  crown turns to dark blobs; at 0.2 (34,396) its feathery crown, flowers and pods read as L0.

## Up close and whole, Main | variant (c4)

- `chestnut/chestnut-s9-close.jpg`: the ripe ten-year tree: v7's leaves their full width, long, toothed, glossier;
  the crown fuller than v6's. Truer than v6.
- `chestnut/chestnut-s9-whole.jpg`, `chestnut/chestnut-s12-whole.jpg`: same silhouettes.
  **Still short (for its own intent):** the 50-year tree is see-through in both: v6 a reddish tangle of twigs, v7
  grey limbs with leaves at the shell; a real old chestnut is a dense dome. Not the budget:
  `chestnut/chestnut-grown-leaves.jpg` (v7 | v7 with 16,000 leaves and 65,000 wood past ten years, at 20 and 50 years)
  shows almost no change, so that try was not kept. Its growth keeps half the leaves past the tenth year
  (`lateLeaves`) and grows each to at most 2.6×: the crown's leaf mass is the growth's to fix.
- `hazel/hazel-s9-close.jpg`, `hazel/hazel-s9-whole.jpg`, `hazel/hazel-s12-*`: the same round double-toothed leaves,
  nuts and form; the 20-year crown a little fuller than v5's.
- `moringa/moringa-s9-close.jpg`, `moringa/moringa-s9-whole.jpg`, `moringa/moringa-s6-*`: the feathery
  thrice-divided crown, yellow flowers and long pods as v3. A flaw: the topmost pinnae show their dark undersides
  against the sky a little more often than v3's.

## Sandboxes (c5)

Sandbox 1 pins all three by version: `garden/inside/trees/moringa` v3, `garden/outside/canopy/chestnut` v6,
`garden/outside/trees/hazel` v5 (default breed, tree); and, used by no config, `plant/chestnut` v5, `plant/hazel` v4.
A pin names an accepted version, so they move once these are accepted (`pin_latest` per asset, its own small intent).
No other sandbox pins them.

## Next

- The grown chestnut's crown in leaf (above).
- One shared cut-out leaf piece for walnut, mango, chestnut, hazel and moringa (the spec's next untangle).
- `scripts/render.mjs` fails on main ("catalog is not loaded").
