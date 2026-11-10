#!/usr/bin/env bun
/**
 * Redraw the wrong cells of a reference sheet, keeping the rest: Nano Banana Pro's edit model on fal, the sheet as
 * image 1 and --ref images after it (a person's real photos when a character's face drifted). Written as <out>.png and
 * .jpg (≤ 4 MB) and kept on play, labelled (a character's only in the operator's personal library).
 *
 *   bun tools/sheet/sheet-edit.ts --sheet <sheet.jpg> --fix <fix.txt> --out <dir/sheet-3>
 *       --label "Reference sheet · Orange 'Tarocco' · 3 (sheet 1, cells redrawn)" [--ref <photo>]…
 *       [--library coop|personal] [--kind character] [--no-upload]
 *
 * The fix prompt: "Keep the whole plate exactly as it is … Redraw ONLY these cells", then a numbered paragraph a cell
 * (what is wrong, what the real organ looks like, the data sheet's numbers; orange 'Tarocco', 2026-11-05, was fixed so).
 * Read the result again: an edit can move what it was not asked to.
 */
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { all, dataUrl, fal, library, toJpeg, upload } from "./fal.ts";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
(await import("./allow.ts")).allow(1); // paid: only with --allow <n> (or --dry-run), before any call
const sheet = arg("sheet"), fix = arg("fix"), out = arg("out"), label = arg("label");
if (!sheet || !fix || !out) {
  console.error("Give --sheet <sheet.jpg> --fix <fix.txt> --out <dir/name> [--label <label>] [--ref <photo>]… [--library coop|personal].");
  process.exit(1);
}
const refs = all("ref");
const lib = library(arg("library"), arg("kind"), refs.length);
const input = {
  prompt: readFileSync(fix, "utf8"),
  // the sheet as it is, full size (a 4K plate's JPEG is under 4 MB); the references made small to send
  image_urls: [`data:image/jpeg;base64,${readFileSync(sheet).toString("base64")}`, ...(await Promise.all(refs.map((r) => dataUrl(r))))],
  resolution: "4K",
  aspect_ratio: "16:9",
  output_format: "png",
  num_images: 1,
};
if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify({ model: "fal-ai/nano-banana-pro/edit", library: lib, input: { ...input, image_urls: [sheet, ...refs] } }, null, 2));
  process.exit(0);
}
const result = await fal("fal-ai/nano-banana-pro/edit", input);
const png = `${out}.png`, jpg = `${out}.jpg`;
mkdirSync(dirname(png), { recursive: true }); // the out folder may not exist yet: never lose a paid edit to it
writeFileSync(png, new Uint8Array(await (await fetch(result.images[0].url)).arrayBuffer()));
await toJpeg(png, jpg);
console.log(`${png}  ${result.images[0].width}×${result.images[0].height}  →  ${jpg} (${(statSync(jpg).size / 1e6).toFixed(2)} MB)`);
if (!process.argv.includes("--no-upload")) {
  // kept on play at once, labelled, as sheet.ts keeps every sheet it makes
  const kept: any = await upload(jpg, label ?? `Reference sheet · ${out} (cells redrawn)`, lib);
  writeFileSync(`${out}.hash`, kept.hash);
  console.log(`  kept in play's ${lib === "personal" ? "personal library" : "Library"}: ${kept.hash}`);
}
