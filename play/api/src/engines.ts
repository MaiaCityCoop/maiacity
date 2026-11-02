// The frozen box engines a recipe may run on: the site's one list (play/site/src/lib/kernel/sandbox/engines.json, which
// the image copies to the same place under PLAY_REPO), so a proposal can only name an engine the page holds frozen.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Engine = { v: number; blake3: string };
const at = resolve(process.env.PLAY_REPO ?? resolve(import.meta.dir, "../../.."), "play/site/src/lib/kernel/sandbox/engines.json");
const list = (JSON.parse(readFileSync(at, "utf8")).box ?? []) as Engine[];

/** every frozen box engine, oldest first */
export const BOX_ENGINES: readonly Engine[] = list;
/** the latest: the one new recipes are made for */
export const LATEST_BOX = list[list.length - 1];
/** box engine `v`, if frozen */
export const boxEngine = (v: unknown) => list.find((e) => e.v === v);
