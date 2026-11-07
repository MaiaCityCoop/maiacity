#!/usr/bin/env bun
/**
 * Redraw the wrong cells of a reference sheet, keeping the rest of the plate as it is: Nano Banana Pro's edit model on
 * fal (`fal-ai/nano-banana-pro/edit`), the sheet as its first image and a prompt naming each cell and what it must show;
 * reference images (--ref, repeated: image 2, 3 … in the order given) go with it, a person's real photos when a
 * character's face has drifted. The redrawn plate is written as <out>.png and <out>.jpg (at most 4 MB) and kept at once
 * on play, labelled: in Maia City's Library, or with --library personal in the operator's own; a character's
 * (--kind character) only ever there.
 *
 *   bun tools/sheet/sheet-edit.ts --sheet <sheet.jpg> --fix <fix.txt> --out <dir/sheet-3>
 *       --label "Reference sheet · Orange 'Tarocco' · 3 (sheet 1, cells redrawn)" [--ref <photo>]…
 *       [--library coop|personal] [--kind character] [--no-upload]
 *
 * The fix prompt: first "Keep the whole plate exactly as it is … Redraw ONLY these cells", then one numbered paragraph
 * a cell, its row and label, what is wrong with it and what the real organ looks like, with the data sheet's numbers
 * (orange 'Tarocco', 2026-11-05: the old bark, the trunk's cut, the colour-break fruit, the ripe fruit's collar and its
 * flesh were redrawn this way and the rest of the plate stayed). For a face: "image 1 is the sheet; images 2 … are
 * real photos of this person: redraw the face in cells … to be exactly the person in the photos". Read the result
 * again like the first one: an edit can move what it was not asked to.
 */
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { all, dataUrl, fal, library, toJpeg, upload } from "./fal.ts";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
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
