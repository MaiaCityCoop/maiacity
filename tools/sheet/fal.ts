/**
 * What sheet.ts and sheet-edit.ts share: a model's run on fal's queue, reference images as data URLs, the plate as a
 * JPEG play keeps (at most 4 MB), and keeping an image on play, in Maia City's Library or in the operator's personal
 * one (MCP add_story_frame, the session's PLAY_MCP_TOKEN).
 */
import { $ } from "bun";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Library = "coop" | "personal";

/**
 * The library an image goes to: `--library coop|personal`; a character's sheet and photos only ever the personal one.
 * Made from reference photos, the library must be named: someone's photos never fall into Maia City's by default.
 */
export function library(given: string | undefined, kind?: string, refs = 0): Library {
  if (given !== undefined && given !== "coop" && given !== "personal") throw new Error(`--library is coop or personal, not ${given}.`);
  if (kind === "character") {
    // a person's own face: never in Maia City's Library, whatever is given
    if (given === "coop") throw new Error("A character's sheet is kept only in the personal library: --library personal.");
    return "personal";
  }
  if (given === undefined && refs > 0) throw new Error("Made from reference photos: name the library, --library personal (or coop, if the photos are Maia City's).");
  return (given as Library) ?? "coop";
}

/** Every value of a repeatable flag, in order (`--ref a.jpg --ref b.jpg`). */
export function all(name: string, argv = process.argv): string[] {
  const out: string[] = [];
  argv.forEach((a, i) => {
    if (a === `--${name}` && argv[i + 1] !== undefined) out.push(argv[i + 1]);
  });
  return out;
}

/** A reference image as a data URL, its long side at most `max` px (a JPEG, so a phone's photo stays small to send). */
export async function dataUrl(file: string, max = 2048): Promise<string> {
  statSync(file); // a missing reference fails here, before anything is paid for
  const dir = mkdtempSync(join(tmpdir(), "ref-"));
  const jpg = join(dir, "ref.jpg");
  await $`convert ${file} -auto-orient -resize ${`${max}x${max}>`} -quality 92 ${jpg}`.quiet();
  return `data:image/jpeg;base64,${readFileSync(jpg).toString("base64")}`;
}

/** The fal key: FAL_API_KEY (or FAL_KEY). In avenBOX the proxy puts the real key on queue.fal.run; any value will do. */
export function falKey(): string {
  const key = process.env.FAL_API_KEY ?? process.env.FAL_KEY;
  if (!key) throw new Error("FAL_API_KEY is not set (in avenBOX any value: the proxy sends the real key to queue.fal.run).");
  return key;
}

/** One run of a model on fal's queue, waited for; its result (images: [{url, width, height}]). */
export async function fal(model: string, input: Record<string, unknown>): Promise<any> {
  const headers = { Authorization: `Key ${falKey()}`, "Content-Type": "application/json" };
  const res = await fetch(`https://queue.fal.run/${model}`, { method: "POST", headers, body: JSON.stringify(input) });
  const submit: any = await res.json().catch(() => ({ status: res.status }));
  if (!submit.status_url) throw new Error(`${model}: ${res.status} ${JSON.stringify(submit)}`);
  console.error(`${model}: ${submit.request_id}`);
  for (;;) {
    const st: any = await (await fetch(submit.status_url, { headers })).json();
    if (st.status === "COMPLETED") break;
    if (st.status !== "IN_QUEUE" && st.status !== "IN_PROGRESS") throw new Error(JSON.stringify(st));
    await Bun.sleep(4000);
  }
  const result: any = await (await fetch(submit.response_url, { headers })).json();
  if (!result.images?.length) throw new Error(JSON.stringify(result));
  return result;
}

/** The plate as a JPEG play keeps: full size, at the highest quality under 3.9 MB. */
export async function toJpeg(png: string, jpg: string) {
  for (const q of [92, 88, 84, 80, 75, 70]) {
    await $`convert ${png} -quality ${q} ${jpg}`.quiet();
    if (statSync(jpg).size <= 3.9e6) return;
  }
}

/** Keep one image on play, labelled, in the library named: its hash and where it went. */
export async function upload(file: string, label: string | undefined, lib: Library) {
  const token = process.env.PLAY_MCP_TOKEN;
  if (!token) throw new Error("PLAY_MCP_TOKEN is not set.");
  if (statSync(file).size > 4e6) throw new Error(`${file} is over 4 MB: play keeps images up to 4 MB.`);
  const data = readFileSync(file).toString("base64");
  const media_type = /\.png$/i.test(file) ? "image/png" : /\.webp$/i.test(file) ? "image/webp" : "image/jpeg";
  const args = { data, media_type, library: lib, ...(label ? { label: label.slice(0, 200) } : {}) };
  const res = await fetch("https://play.maia.city/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "add_story_frame", arguments: args } }),
  });
  const out: any = await res.json();
  if (out.error || out.result?.isError) throw new Error(JSON.stringify(out.error ?? out.result));
  return { library: lib, ...(out.result.structuredContent ?? JSON.parse(out.result.content[0].text)) };
}
