#!/usr/bin/env bun
/**
 * Redraw the wrong cells of a reference sheet, keeping the rest of the plate as it is: Nano Banana Pro's edit model on
 * fal (`fal-ai/nano-banana-pro/edit`), the sheet as its image and a prompt naming each cell and what it must show. The
 * redrawn plate is written as <out>.png and <out>.jpg (at most 4 MB) and kept at once in play's Library, labelled.
 *
 *   bun tools/sheet/sheet-edit.ts --sheet <sheet.jpg> --fix <fix.txt> --out <dir/sheet-3>
 *       --label "Reference sheet · Orange 'Tarocco' · 3 (sheet 1, cells redrawn)" [--no-upload]
 *
 * The fix prompt: first "Keep the whole plate exactly as it is … Redraw ONLY these cells", then one numbered paragraph
 * a cell, its row and label, what is wrong with it and what the real organ looks like, with the data sheet's numbers
 * (orange 'Tarocco', 2026-11-05: the old bark, the trunk's cut, the colour-break fruit, the ripe fruit's collar and its
 * flesh were redrawn this way and the rest of the plate stayed). Read the result again like the first one: an edit can
 * move what it was not asked to.
 */
import { $ } from "bun";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname } from "node:path";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const sheet = arg("sheet"), fix = arg("fix"), out = arg("out"), label = arg("label");
if (!sheet || !fix || !out) {
  console.error("Give --sheet <sheet.jpg> --fix <fix.txt> --out <dir/name> [--label <label>].");
  process.exit(1);
}
const key = process.env.FAL_API_KEY ?? process.env.FAL_KEY;
if (!key) throw new Error("FAL_API_KEY is not set.");
const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
const input = {
  prompt: readFileSync(fix, "utf8"),
  image_urls: [`data:image/jpeg;base64,${readFileSync(sheet).toString("base64")}`],
  resolution: "4K",
  aspect_ratio: "16:9",
  output_format: "png",
  num_images: 1,
};
const submit: any = await (await fetch("https://queue.fal.run/fal-ai/nano-banana-pro/edit", { method: "POST", headers, body: JSON.stringify(input) })).json();
if (!submit.status_url) throw new Error(JSON.stringify(submit));
console.error(`fal-ai/nano-banana-pro/edit: ${submit.request_id}`);
for (;;) {
  const st: any = await (await fetch(submit.status_url, { headers })).json();
  if (st.status === "COMPLETED") break;
  if (st.status !== "IN_QUEUE" && st.status !== "IN_PROGRESS") throw new Error(JSON.stringify(st));
  await Bun.sleep(4000);
}
const result: any = await (await fetch(submit.response_url, { headers })).json();
if (!result.images?.length) throw new Error(JSON.stringify(result));
const png = `${out}.png`, jpg = `${out}.jpg`;
mkdirSync(dirname(png), { recursive: true }); // the out folder may not exist yet: never lose a paid edit to it
writeFileSync(png, new Uint8Array(await (await fetch(result.images[0].url)).arrayBuffer()));
for (const q of [92, 88, 84, 80, 75]) {
  await $`convert ${png} -quality ${q} ${jpg}`.quiet();
  if (statSync(jpg).size <= 3.9e6) break;
}
console.log(`${png}  ${result.images[0].width}×${result.images[0].height}  →  ${jpg} (${(statSync(jpg).size / 1e6).toFixed(2)} MB)`);
if (!process.argv.includes("--no-upload")) {
  // kept in play's Library at once, labelled, as sheet.ts keeps every sheet it makes
  const kept = await $`bun ${import.meta.dir}/sheet.ts --upload ${jpg} --label ${label ?? `Reference sheet · ${out} (cells redrawn)`}`.text();
  const hash = JSON.parse(kept).hash;
  writeFileSync(`${out}.hash`, hash);
  console.log(`  kept in play's Library: ${hash}`);
}
