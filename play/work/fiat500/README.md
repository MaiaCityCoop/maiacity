# The Fiat 500 F, before its propose (intent b9b38999-2d57-4be9-b864-df7af14aa5b8)

Its readable source lives here until it is proposed (the asset exists on play only then).

- `source/fiat500.js`: the whole readable source as it will be proposed (CommonJS). Made by
  `tools/assemble.py` from the travel van's source (02cb455f-7471-59d2-a0e7-e9b0600e3eb2 v1, file
  0bdc1bf0…): its runtime, `kit.js`, `parts.js` and `vehicle.js` regions byte for byte, then the Fiat's own
  `source/fiat500.region.js`, then `versions.js`, the Fiat's `source/index.region.js`, `refs.js`, `recipe.js` and the
  entry.
- `tools/trace.py`, `tools/tables.py`, `tools/data.py`: the reference sheet's row-1 outlines traced, scaled to the
  cited length, width and height, and binned into `tools/trace-data.json`, which the region's `TRACE` holds.
- `tools/build.cjs`: builds the source headlessly (Bun) and prints its outer box.
- `renders/`: the renders judged, beside the sheet's cells.

    python3 -I tools/assemble.py <van source> source/fiat500.region.js source/index.region.js tools/trace-data.json source/fiat500.js
