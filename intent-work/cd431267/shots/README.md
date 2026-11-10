# cd431267 · c3 screenshots (avenBOX, software rendering)

Taken in avenBOX's Chromium (SwiftShader) at 390 × 844 (a phone: `isMobile`, touch) and 1440 × 900, at deviceScaleFactor 2,
of the asset library's viewers on play's live data: the dev server (`bun run dev`) with `/api` sent to a read-only
proxy (`proxy.ts`: GET only, to play.maia.city with the admin's MCP token, play's read-only world routes). `shots.mjs
<main|head>` takes each viewer once its build is shown.

- the rabbit (`/animals/#aa8a56ec-…`, Wild agouti v2), the tomato (`/plants/#714b2deb-…`, a plant: Plant | Fruit |
  Roots, its Latin name, its stages), the LifeTrac v25 (`/machines/#4548aeef-…`, a machine: its moves and views).
- `main-*.jpg`: main (3d0d0f2): the white band with the chips above the canvas, the scene under it.
- `head-*.jpg`: head: the scene full height, the band gone; each label and chip a pill in the nav pill's look
  (translucent paper, blur, hairline, a soft shadow) floating over the sky, the row scrolling sideways on a phone. The
  camera frames the thing in the canvas under the row (`turntable.js` `fit`: the view offset by the row's height), so
  it stands where it stood on main, and the sky goes on up behind the chips.

The notch: the row's top padding is `max(0.65rem, env(safe-area-inset-top))`; Chromium gives no safe-area inset, so
these shots show the plain 0.65rem.
