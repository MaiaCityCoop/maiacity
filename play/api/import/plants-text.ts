// Run once to read each plant's words out of legacy's plant library (maia/content/plants): its Latin name, layer, where
// it comes from, its note and its stages, by plant and version, into ./plants.json. The import writes them into
// each plant version's card (card.plant), where play keeps them: the database, not the library's code.
//
//   bun import/plants-text.ts
import { plugin } from "bun";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../../..");
const ALIASES: Record<string, string> = { $content: "maia/content", $kernel: "aven/kernel", $lib: "maia/site/lib", $avendb: "aven/db/page" };
plugin({
  name: "repo aliases",
  setup(build) {
    build.onResolve({ filter: /^\$(content|kernel|lib|avendb)(\/|$)/ }, (args) => {
      const [alias, ...rest] = args.path.split("/");
      return { path: join(ROOT, ALIASES[alias], ...rest) };
    });
  },
});

const m: any = await import(join(ROOT, "maia/content/plants/index.js"));
const layers = new Map((m.LAYERS ?? []).map((l: any) => [l.id, { id: l.id, label: l.label, note: l.note }]));
const out: Record<string, unknown> = {};
for (const p of m.ALL_PLANTS ?? m.PLANTS ?? []) {
  for (const v of p.versions?.map((x: any) => x.v) ?? [p.v ?? 1]) {
    const at = m.plantAt(p.id, v);
    if (!at) continue;
    out[`${p.id}@${v}`] = {
      label: at.label, latin: at.latin, from: at.from, note: at.note,
      layer: layers.get(at.layer) ?? (at.layer ? { id: at.layer } : null),
      stages: (at.stages ?? []).map((s: any) => ({ name: s.name, day: s.day, note: s.note })),
    };
  }
}
await Bun.write(join(import.meta.dir, "plants.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`${Object.keys(out).length} plant versions`);
