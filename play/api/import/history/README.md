# The steps between versions, where they were kept

Every asset is a Loro document (play/SPEC.md §4.4, `../../src/assetdocs.ts`), its history made from its accepted
versions the first time: each version one step, at its own date, named its own number. Where the work between two
versions was kept, its steps are here, and the history gets them too, between those two versions, so the asset viewer's
history bar plays the work as it was done.

`<uuid>/index.json`, in a folder named by the asset's id (its UUID; its `name` is only shown), names the asset, the version the steps start after (`after`, whose source is `from`) and the
one they lead to (`before`, whose source is `lands`), who made them (`by: "before"`: the author of the version they lead
to, `via` how), and each step's file, its BLAKE3 hash, when it was made and its message. The steps go in only where the
asset's versions are exactly those sources, each file is checked against its hash, and the version they lead to is
then the next step, byte for byte (`final`).

## e46e8e6f-cd69-5c1e-88c8-cea2032bf600 (plants/papaya)

Maia's nine draft rounds between papaya v1 (legacy's, imported) and v2 (proposed by Maia over play's MCP on 3 November
2026, accepted by Samuel): `round1.js` … `round9.js`, each the whole readable source as it stood at the end of that
round, timed by when it was written. Round 1 is the first draft of the new papaya (its colours still too dark, its
leaves still the wrong shape); rounds 2 to 9 are the corrections made against 26 photographs of real papayas (the leaf
lobes, the trunk's leaf scars, the fruit column, the flowers that drop when there is no room, the cut fruit). `v2.js`
is the source v2 was accepted with, the same bytes as play holds for it (BLAKE3 `70efa647…`).
