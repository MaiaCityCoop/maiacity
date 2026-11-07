#!/usr/bin/env bun
/**
 * An asset's reference sheet: one clean-lit photographic plate of the one real thing, every view and detail the model
 * is held to, made by Google's image model (Nano Banana Pro on fal) from its brief and data sheet, and kept on play
 * among its files by its BLAKE3 hash. One tool for every kind; only the plate's prompt differs: a plant's is a
 * botanical plate of specimens (plant-skill, "The reference sheet"), a machine's a studio turnaround with close-ups
 * (machine-skill), a character's a casting turnaround of one real person from their own photos (actor-skill, "Your own
 * character").
 *
 *   bun tools/sheet/sheet.ts --kind plant|machine|character --brief <brief.md> --out <dir> [--datasheet <datasheet.md>]
 *       [--ref <photo>]… [--library coop|personal] [--label "Lemon 'Femminello Santa Teresa'"]
 *       [--model fal-ai/nano-banana-pro] [--resolution 4K] [--aspect 16:9] [--n 1] [--search] [--no-upload] [--dry-run]
 *   bun tools/sheet/sheet.ts --upload <file.jpg> --label <label> [--library coop|personal]
 *
 * The brief is the thing and the plate's layout, row by row (the sub skill's rows); the data sheet, when given, goes
 * to the model as context. Reference images (--ref, repeated; image 1, 2 … in the order given, the brief saying what
 * each is the truth for) send the plate to the edit model (fal-ai/nano-banana-pro/edit) with them as its images; a
 * character is always made from the person's own photos. Each image is written as sheet-<k>.png (as made) and
 * sheet-<k>.jpg (for play: at most 4 MB), with prompt.txt and result.json beside them, and kept at once on play (MCP
 * add_story_frame, the session's PLAY_MCP_TOKEN), labelled "Reference sheet · <label> · <k>" (--label, else the
 * brief's first line), its hash printed and written to sheet-<k>.hash: the one the user gives the go for is named on
 * the asset's card as `sheet`. It goes to Maia City's Library, or with --library personal to the operator's own,
 * private to them; a character's sheet only ever to the personal one (--library coop is refused). Keep a person's
 * photos, brief and sheet out of the repository (it is public): --out a scratch folder. --no-upload keeps them only
 * here; --dry-run writes prompt.txt and request.json and calls nothing; --upload keeps one more (the same image is the
 * same hash, its label replaced).
 */
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { all, dataUrl, fal, library, toJpeg, upload } from "./fal.ts";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

if (arg("upload")) {
  console.log(JSON.stringify(await upload(arg("upload")!, arg("label"), library(arg("library"), arg("kind"))), null, 2));
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
  character: (brief) => `A character reference sheet of ONE real living person, as a film's costume and casting department photographs an actor for the 3D artists who will build their digital double: one large photograph laid out as a clean grid of views and close-ups of exactly this person, every one a real photograph of a real person, not an illustration, not a 3D render, not a doll.

THE REFERENCE PHOTOS given with this prompt are of this person. The FACE is theirs: keep their identity exactly (the shape of the skull, brow, eyes and their colour, eyelids, nose, cheekbones, mouth, jaw, chin and ears, their skin and how they smile), as in the photos the brief names as the truth for the face; where a photo is named only for the clothes or the mood, take nothing from its face. Do not beautify, de-age, slim, idealise or change the ethnicity; where the brief describes hair or beard, it is as the brief says, not as in an older photo.

THE PERSON, THEIR CLOTHES, and the LAYOUT of the plate, row by row, ${CELLS}:
${brief}

LIGHT AND CAMERA: ${LIGHT}; large overhead softboxes, soft and even, only a faint contact shadow under the feet. The turnaround (front, side, back, three-quarter) is full-length, straight-on orthographic views with a very long lens, no perspective, all at ONE scale, standing on ONE shared ground line in the same relaxed A-pose (arms slightly away from the body, feet hip-width), beside a vertical height scale in centimetres reaching their real height, so the views compare and measure. The head close-ups are at eye level, the face filling the cell. True colours of skin, beard, eyes and cloth in daylight, nothing saturated or stylised. Ultra-detailed and photographic: skin pores and fine lines, single beard hairs, the weave and creases of the cloth, the stitching of the seams, the nails readable.

DO NOT: drawings, sketches, cartoons, anime, painterly or CGI looks; a different face in any cell, or a face that drifts between cells; makeup, jewellery, logos, text or prints on the clothes unless the brief names them; props, scenery, other people; overlapping cells; decorative borders; text other than the labels and the scale's numbers.`,
};

const kind = arg("kind");
const briefFile = arg("brief");
const out = arg("out");
if (!kind || !PLATES[kind] || !briefFile || !out) {
  console.error(`Give --kind ${Object.keys(PLATES).join("|")}, --brief <brief.md> and --out <dir> (or --upload <file.jpg>).`);
  process.exit(1);
}
const brief = readFileSync(briefFile, "utf8").trim();
const datasheet = arg("datasheet") ? readFileSync(arg("datasheet")!, "utf8") : "";
const PLATE = PLATES[kind](brief);
mkdirSync(out, { recursive: true });

// --- the model --------------------------------------------------------------------------------------------------
// Reference photos (--ref, in order: image 1, 2 … as the brief names them) go to the edit model as its images; a
// character's plate is always made from them.
const refs = all("ref");
if (kind === "character" && !refs.length) throw new Error("A character's sheet is made from the person's own photos: give them with --ref <photo> (repeated).");
const lib = library(arg("library"), kind, refs.length);
const model = arg("model", refs.length ? "fal-ai/nano-banana-pro/edit" : "fal-ai/nano-banana-pro")!;
const refsNote = refs.length ? `\n\nTHE REFERENCE IMAGES, in the order given: ${refs.map((_, i) => `image ${i + 1}`).join(", ")}; the brief says what each is the truth for.` : "";
writeFileSync(join(out, "prompt.txt"), PLATE + refsNote + (datasheet ? `\n\n--- context: the data sheet ---\n${datasheet}` : ""));
const input: Record<string, unknown> = {
  prompt: PLATE + refsNote,
  aspect_ratio: arg("aspect", "16:9"),
  resolution: arg("resolution", "4K"),
  output_format: "png",
  num_images: Number(arg("n", "1")),
  ...(refs.length ? { image_urls: await Promise.all(refs.map((r) => dataUrl(r))) } : {}),
  ...(flag("search") ? { enable_web_search: true } : {}),
  ...(datasheet && model === "fal-ai/nano-banana-pro" ? { context: [{ type: "text", text: `The ${kind}'s data sheet, the numbers every view keeps to:\n${datasheet}` }] } : {}),
};
const shown = { ...input, prompt: "(prompt.txt)", context: input.context ? "(data sheet)" : undefined, image_urls: refs.length ? refs.map((r) => `(${r})`) : undefined };
if (flag("dry-run")) {
  // everything but the paid call: the prompt is in prompt.txt, the request beside it
  writeFileSync(join(out, "request.json"), JSON.stringify({ model, library: lib, input: shown }, null, 2));
  console.log(`dry run: ${join(out, "prompt.txt")}, ${join(out, "request.json")} (${model}, ${refs.length} reference images, library ${lib})`);
  process.exit(0);
}
const result = await fal(model, input);
writeFileSync(join(out, "result.json"), JSON.stringify({ model, input: shown, result }, null, 2));
for (const [k, img] of result.images.entries()) {
  const png = join(out, `sheet-${k + 1}.png`);
  writeFileSync(png, new Uint8Array(await (await fetch(img.url)).arrayBuffer()));
  // play keeps images up to 4 MB: the plate as a JPEG, full size, at the highest quality that fits
  const jpg = join(out, `sheet-${k + 1}.jpg`);
  await toJpeg(png, jpg);
  console.log(`${png}  ${img.width}×${img.height}  →  ${jpg} (${(statSync(jpg).size / 1e6).toFixed(2)} MB)`);
  if (!flag("no-upload")) {
    const name = arg("label") ?? brief.split("\n")[0].replace(/[*_#`]/g, "").trim().slice(0, 120);
    const kept: any = await upload(jpg, `Reference sheet · ${name} · ${k + 1}`, lib);
    writeFileSync(join(out, `sheet-${k + 1}.hash`), kept.hash);
    console.log(`  kept in play's ${lib === "personal" ? "personal library" : "Library"}: ${kept.hash}`);
  }
}
