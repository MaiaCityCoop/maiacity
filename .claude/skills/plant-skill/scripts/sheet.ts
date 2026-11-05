#!/usr/bin/env bun
/**
 * The plant's reference sheet: one clean-lit photographic plate of the whole plant, made by Google's image model
 * (Nano Banana Pro on fal), grounded in the plant's data sheet, and kept on play among its files by its BLAKE3 hash.
 *
 *   bun .claude/skills/plant-skill/scripts/sheet.ts --brief <brief.md> --out <dir> [--datasheet <datasheet.md>]
 *       [--label "Lemon 'Femminello Santa Teresa'"] [--model fal-ai/nano-banana-pro] [--resolution 4K] [--aspect 16:9]
 *       [--n 2] [--search] [--no-upload]
 *   bun .claude/skills/plant-skill/scripts/sheet.ts --upload <file.jpg> --label <label>
 *   bun .claude/skills/plant-skill/scripts/sheet.ts --edit <sheet.jpg> --brief <fix.md> --out <dir> --label <label>
 *
 * With --edit, a sheet already made is redrawn where it is wrong (fal-ai/nano-banana-pro/edit): the brief is then the
 * instruction as it is ("Redraw only the cells …, keep every other cell exactly as it is"), the data sheet its context.
 *
 * The brief is the plant and the plate's layout (SKILL.md, "The reference sheet"): its full Latin name and cultivar,
 * its organs with their real sizes and colours, then the rows: the stages from what is planted to ripe fruit, the
 * parts close up (roots, bark or stem, leaves, buds), the flower and the fruit by age, cut, and a colour checker. The data sheet,
 * when given, goes to the model with the prompt as context. Each image is written as sheet-<k>.png (as made) and
 * sheet-<k>.jpg (for play: at most 4 MB), with prompt.txt beside them. Every sheet made is kept at once in play's
 * Library (MCP add_story_frame, the session's PLAY_MCP_TOKEN), labelled "Reference sheet · <label> · <k>" (the
 * label from --label, else the brief's first line), and its BLAKE3 hash printed (and written to sheet-<k>.hash): the
 * one the user gives the go for is named in the plant's meta as `sheet`. --no-upload keeps them only here; --upload
 * <jpg> --label <label> keeps one more (or labels one again: the same image is the same hash, its label replaced).
 */
import { $ } from "bun";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

// --- keep one image on play -------------------------------------------------------------------------------------
async function upload(file: string, label?: string) {
  const token = process.env.PLAY_MCP_TOKEN;
  if (!token) throw new Error("PLAY_MCP_TOKEN is not set.");
  if (statSync(file).size > 4e6) throw new Error(`${file} is over 4 MB: play keeps images up to 4 MB.`);
  const data = readFileSync(file).toString("base64");
  const res = await fetch("https://play.maia.city/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "add_story_frame", arguments: { data, media_type: "image/jpeg", ...(label ? { label: label.slice(0, 200) } : {}) } } }),
  });
  const out: any = await res.json();
  if (out.error || out.result?.isError) throw new Error(JSON.stringify(out.error ?? out.result));
  return out.result.structuredContent ?? JSON.parse(out.result.content[0].text);
}

if (arg("upload")) {
  console.log(JSON.stringify(await upload(arg("upload")!, arg("label")), null, 2));
  process.exit(0);
}

// --- the prompt -------------------------------------------------------------------------------------------------
const briefFile = arg("brief");
const out = arg("out");
if (!briefFile || !out) {
  console.error("Give --brief <brief.md> and --out <dir> (or --upload <file.jpg>).");
  process.exit(1);
}
const brief = readFileSync(briefFile, "utf8").trim();
const datasheet = arg("datasheet") ? readFileSync(arg("datasheet")!, "utf8") : "";

// What makes the sheet measurable: one light, one background, one scale, straight-on views, real specimens.
const PLATE = `A botanical reference plate, as a natural-history museum photographs specimens for a field guide: one large photograph laid out as a clean grid of separate specimens of ONE plant, every one a real photographed specimen, not an illustration.

THE PLANT (every specimen is exactly this cultivar, true to its botany and to the numbers given), and the LAYOUT of the plate, row by row, each specimen in its own cell with white space round it and a short thin dark-grey label under it in plain sans-serif (its name and its real size), each beside a scale bar in centimetres or metres:
${brief}

LIGHT AND CAMERA: a pure white seamless background (#FFFFFF), even shadowless light as on a light box or under a large overhead softbox, 5500 K daylight, no cast shadows, no rim light, no vignette, no reflections, no depth-of-field blur: every specimen sharp edge to edge. Straight-on orthographic views with a long lens, no perspective distortion, every specimen in a cell drawn at the scale its scale bar shows. True colours as the plant has them in daylight, nothing saturated or stylised. Ultra-detailed: leaf veins, hairs, lenticels, bark fissures, skin pores, the texture of the seed coat readable.

DO NOT: drawings, watercolour, painterly or 3D-render looks; hands, pots, tools, props, soil on the parts; any specimen of another plant or cultivar; overlapping cells; decorative borders; text other than the labels.`;

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "prompt.txt"), (arg("edit") ? brief : PLATE) + (datasheet ? `\n\n--- context: the data sheet ---\n${datasheet}` : ""));

// --- the model --------------------------------------------------------------------------------------------------
const editing = arg("edit");
const model = arg("model", editing ? "fal-ai/nano-banana-pro/edit" : "fal-ai/nano-banana-pro")!;
const key = process.env.FAL_API_KEY ?? process.env.FAL_KEY;
if (!key) throw new Error("FAL_API_KEY is not set.");
const input: Record<string, unknown> = {
  prompt: editing ? brief : PLATE,
  ...(editing ? { image_urls: [`data:image/jpeg;base64,${readFileSync(editing).toString("base64")}`] } : {}),
  aspect_ratio: arg("aspect", "16:9"),
  resolution: arg("resolution", "4K"),
  output_format: "png",
  num_images: Number(arg("n", "1")),
  ...(flag("search") ? { enable_web_search: true } : {}),
  ...(datasheet && model.includes("nano-banana-pro") ? { context: [{ type: "text", text: `The plant's data sheet, the numbers every specimen keeps to:\n${datasheet}` }] } : {}),
};
const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
const submit: any = await (await fetch(`https://queue.fal.run/${model}`, { method: "POST", headers, body: JSON.stringify(input) })).json();
if (!submit.status_url) throw new Error(JSON.stringify(submit));
console.error(`${model}: ${submit.request_id}`);
for (;;) {
  const st: any = await (await fetch(submit.status_url, { headers })).json();
  if (st.status === "COMPLETED") break;
  if (st.status !== "IN_QUEUE" && st.status !== "IN_PROGRESS") throw new Error(JSON.stringify(st));
  await Bun.sleep(4000);
}
const result: any = await (await fetch(submit.response_url, { headers })).json();
if (!result.images?.length) throw new Error(JSON.stringify(result));
writeFileSync(join(out, "result.json"), JSON.stringify({ model, input: { ...input, prompt: "(prompt.txt)", image_urls: input.image_urls ? [editing] : undefined, context: input.context ? "(data sheet)" : undefined }, result }, null, 2));
for (const [k, img] of result.images.entries()) {
  const png = join(out, `sheet-${k + 1}.png`);
  writeFileSync(png, new Uint8Array(await (await fetch(img.url)).arrayBuffer()));
  // play keeps images up to 4 MB: the plate as a JPEG, full size, at the highest quality that fits
  const jpg = join(out, `sheet-${k + 1}.jpg`);
  for (const q of [92, 88, 84, 80, 75]) {
    await $`convert ${png} -quality ${q} ${jpg}`.quiet();
    if (statSync(jpg).size <= 3.9e6) break;
  }
  console.log(`${png}  ${img.width}×${img.height}  →  ${jpg} (${(statSync(jpg).size / 1e6).toFixed(2)} MB)`);
  // kept in play's Library at once, labelled, so every sheet made is there to see and choose from
  if (!flag("no-upload")) {
    const name = arg("label") ?? brief.split("\n")[0].replace(/[*_#`]/g, "").trim().slice(0, 120);
    const kept: any = await upload(jpg, `Reference sheet · ${name} · ${k + 1}`);
    writeFileSync(join(out, `sheet-${k + 1}.hash`), kept.hash);
    console.log(`  kept in play's Library: ${kept.hash}`);
  }
}
