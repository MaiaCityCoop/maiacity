# site-content: fix 3, one loader, one hash, one pin for play/site's content

Builder of area `site-content` (branch `intent/5884ade4-u-site-content`). Problems are cited as `site-assets#n` and
`site-worlds#n` (the audits' numbers), fixes as `site-assets Fn` / `site-worlds Fn`.

## Moves

1. **Pins first.** Vitests for what nothing pinned and the moves below touch: the device cache's keys and file format
   (`content/assets/cache.test.ts`: golden keys, a golden packed file, nothing kept without OPFS), the asset viewer's
   build (`sources/viewer.test.ts`: what it reads, keeps under which key, and every message it fails with), the names
   of an asset (`catalog.test.ts`: `resolve` of builds and slots, and the refs the worlds write: the pallet, Sandbox 3's
   things and plants, the garden's `refOf`), and the Sandbox 1 and 5 pages as served (`routes/sandbox-5/page.test.ts`,
   an SSR snapshot of each: head, cover, bar).
