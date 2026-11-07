#!/usr/bin/env bun
/**
 * An asset's reference sheet: one clean-lit photographic plate of the one real thing, every view and detail the model
 * is held to, made by Google's image model (Nano Banana Pro on fal) from its brief and data sheet, and kept on play
 * among its files by its BLAKE3 hash. One tool for every kind; only the plate's prompt differs: a plant's is a
 * botanical plate of specimens (plant-skill, "The reference sheet"), a machine's a studio turnaround with close-ups
 * (machine-skill).
 *
 *   bun tools/sheet/sheet.ts --kind plant|machine --brief <brief.md> --out <dir> [--datasheet <datasheet.md>]
 *       [--label "Lemon 'Femminello Santa Teresa'"] [--model fal-ai/nano-banana-pro] [--resolution 4K] [--aspect 16:9]
 *       [--n 1] [--search] [--no-upload]
 *   bun tools/sheet/sheet.ts --upload <file.jpg> --label <label>
 *
 * The brief is the thing and the plate's layout, row by row (the sub skill's rows); the data sheet, when given, goes
 * to the model as context. Each image is written as sheet-<k>.png (as made) and sheet-<k>.jpg (for play: at most
 * 4 MB), with prompt.txt and result.json beside them, and kept at once in play's Library (MCP add_story_frame, the
 * session's PLAY_MCP_TOKEN), labelled "Reference sheet · <label> · <k>" (--label, else the brief's first line), its
 * hash printed and written to sheet-<k>.hash: the one the user gives the go for is named on the asset's card as
 * `sheet`. --no-upload keeps them only here; --upload keeps one more (the same image is the same hash, its label replaced).
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

// --- the prompt: what makes the sheet measurable and true, one light, one background, one scale -----------------
const LIGHT = "a pure white seamless background (#FFFFFF), 5500 K daylight, no vignette, no depth-of-field blur: everything sharp edge to edge";
const CELLS = "each in its own cell with white space round it and a short thin dark-grey label under it in plain sans-serif";
const PLATES: Record<string, (brief: string) => string> = {
  plant: (brief) => `A botanical reference plate, as a natural-history museum photographs specimens for a field guide: one large photograph laid out as a clean grid of separate specimens of ONE plant, every one a real photographed specimen, not an illustration.

THE PLANT (every specimen is exactly this cultivar, true to its botany and to the numbers given), and the LAYOUT of the plate, row by row, ${CELLS} (its name and its real size), each beside a scale bar in centimetres or metres:
${brief}

LIGHT AND CAMERA: ${LIGHT}; even shadowless light as on a light box or under a large overhead softbox, no cast shadows, no rim light, no reflections. Straight-on orthographic views with a long lens, no perspective distortion, every specimen in a cell drawn at the scale its scale bar shows. True colours as the plant has them in daylight, nothing saturated or stylised. Ultra-detailed: leaf veins, hairs, lenticels, bark fissures, skin pores, the texture of the seed coat readable.

DO NOT: drawings, watercolour, painterly or 3D-render looks; hands, pots, tools, props, soil on the parts; any specimen of another plant or cultivar; overlapping cells; decorative borders; text other than the labels.`,
  machine: (brief) => `A product-design reference sheet of ONE real machine, as a car maker's design studio or a museum photographs a restored original for its archive: one large photograph laid out as a clean grid of views and close-ups of exactly this machine, every one a real photograph of the real object, not an illustration, not a 3D render, not a toy or a model.

THE MACHINE (every view is exactly this make, model, version and year, true to its engineering and to the numbers given; where the brief names a detail, draw that detail as it really is), and the LAYOUT of the plate, row by row, ${CELLS}:
${brief}

LIGHT AND CAMERA: ${LIGHT}; large overhead softboxes, soft and even, only a faint contact shadow under the tyres, no hard reflections of the studio. The turnaround views (side, front, rear, top) are straight-on orthographic views with a very long lens, no perspective, all at ONE scale, standing on one shared ground line, so their sizes compare. True colours as the paint, chrome, glass, rubber and fabric really look in daylight, nothing saturated or stylised. Ultra-detailed and photographic: panel gaps, chrome reflections, rubber seals, the texture of the canvas, the tread of the tyres, the louvres, the lamp lenses' optics readable.

DO NOT: drawings, sketches, blueprints, cartoons, painterly or CGI looks; people, hands, props, scenery, number plates with text, badges or brand lettering (leave every badge and script off, plates blank); any other model, version or modern replica; modern wheels or modifications; overlapping cells; decorative borders; text other than the labels.`,
};

const kind = arg("kind");
const briefFile = arg("brief");
const out = arg("out");
if (!kind || !PLATES[kind] || !briefFile || !out) {
  console.error(`Give --kind ${Object.keys(PLATES).join("|")}, --brief <brief.md> and --out <dir> (or --upload <file.jpg>).`);
  process.exit(1);
}
const brief = readFileSync(briefFile, "utf8").trim();
(await import("./allow.ts")).allow(Number(arg("n", "1"))); // paid: only with --allow <n> (or --dry-run), before any call
const datasheet = arg("datasheet") ? readFileSync(arg("datasheet")!, "utf8") : "";
const PLATE = PLATES[kind](brief);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "prompt.txt"), PLATE + (datasheet ? `\n\n--- context: the data sheet ---\n${datasheet}` : ""));

// --- the model --------------------------------------------------------------------------------------------------
const model = arg("model", "fal-ai/nano-banana-pro")!;
const key = process.env.FAL_API_KEY ?? process.env.FAL_KEY;
if (!key) throw new Error("FAL_API_KEY is not set.");
const input: Record<string, unknown> = {
  prompt: PLATE,
  aspect_ratio: arg("aspect", "16:9"),
  resolution: arg("resolution", "4K"),
  output_format: "png",
  num_images: Number(arg("n", "1")),
  ...(flag("search") ? { enable_web_search: true } : {}),
  ...(datasheet && model.includes("nano-banana-pro") ? { context: [{ type: "text", text: `The ${kind}'s data sheet, the numbers every view keeps to:\n${datasheet}` }] } : {}),
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
writeFileSync(join(out, "result.json"), JSON.stringify({ model, input: { ...input, prompt: "(prompt.txt)", context: input.context ? "(data sheet)" : undefined }, result }, null, 2));
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
  if (!flag("no-upload")) {
    const name = arg("label") ?? brief.split("\n")[0].replace(/[*_#`]/g, "").trim().slice(0, 120);
    const kept: any = await upload(jpg, `Reference sheet · ${name} · ${k + 1}`);
    writeFileSync(join(out, `sheet-${k + 1}.hash`), kept.hash);
    console.log(`  kept in play's Library: ${kept.hash}`);
  }
}
