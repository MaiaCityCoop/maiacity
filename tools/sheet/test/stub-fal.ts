/**
 * Preloaded by sheet.test.ts: fal and play stubbed, no network. Every request is appended to $STUB_LOG and answered
 * as fal's queue would (a submission, COMPLETED, a result of `num_images` images; each image a 1×1 PNG).
 */
import { appendFileSync } from "node:fs";

const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
let images = 1;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(typeof input === "string" ? input : input.url ?? input);
  const method = String(init?.method ?? "GET").toUpperCase();
  appendFileSync(process.env.STUB_LOG!, `${method} ${url}\n`);
  const json = (v: unknown) => new Response(JSON.stringify(v), { headers: { "Content-Type": "application/json" } });
  if (url.startsWith("https://queue.fal.run/") && method === "POST") {
    images = Number(JSON.parse(String(init.body)).num_images ?? 1);
    return json({ request_id: "stub", status_url: "https://queue.fal.run/stub/requests/stub/status", response_url: "https://queue.fal.run/stub/requests/stub" });
  }
  if (url.endsWith("/status")) return json({ status: "COMPLETED" });
  if (url === "https://queue.fal.run/stub/requests/stub") return json({ images: Array.from({ length: images }, (_, k) => ({ url: `https://fal.media/stub-${k}.png`, width: 1, height: 1 })) });
  if (url.startsWith("https://fal.media/")) return new Response(PNG);
  return new Response("not stubbed", { status: 599 });
}) as typeof fetch;
