// The Factories (play/SPEC.md §4.7, §4.8, Samuel 2026-11-04): every production line play shows is a Loro document,
// `factory:<uuid>` (type factory/1, ./docs/schema.ts): its line as AirSup's factory runtime reads it and its bill of
// process. It is versioned like every other document (./versioned.ts, play/SPEC.md "Version control"): an agent drafts a
// change edit by edit in an intent variant (doc_edit), proposes it (propose_doc_version), and a person sees it field by
// field on the intents' board, opens the factory as it would be, and accepts or archives it. Admins only, as the
// Factories are. This is all that is a factory's own: its words, its JSON as an agent reads it, and its list's fields.
import type { Db } from "./pg";
import { register, seedDoc } from "./versioned";

/** a factory's JSON, said for an agent (MCP) */
export const FACTORY_FORMAT =
  "A factory is { schema: 'factory/1', label, note, from, builds: the pin of what it makes, line, stock, assemblies, parts, handling }. " +
  "line is the spec AirSup's factory runtime reads: { product: { name, unit, perToken }, demand: { perDay }, calendar: { shifts, hoursPerShift, startHour }, sizing: { targetUtil }, release, seed, " +
  "stations: [{ id, name, machine (the kit's machine it is drawn as), variant?, cv (cycle time's variation), buffer (in front of it), reserve (spare floor for more machines), operators, mtbf and mttr (s: breakdowns), kind (laser, cnc, robot, line, oven, press, tester), yield?, input? (a stage it is fed), after? (the stations it joins), stage (what leaves it), what and rate (its description and where its rate comes from), ct? }], stages: { stage: its look }, layout, look }. " +
  "A station's cycle time is the sum of every operation at it (the parts' ops and its handling), worked out where the line is drawn, unless it gives its own ct; the line is sized from the demand and run as a discrete event simulation. " +
  "parts: [{ id, label, assembly, qty, raw: { stock?, also?, size?, kg?, bought? }, ops: [{ at: a station's id, s: seconds for one unit's worth, what }] }]; stock: { id: { label, form, … } }; assemblies: [{ id, label }]; handling: { station: [{ at: that station, s, what }] }.";

export const FACTORY = register({
  kind: "factory",
  work: "factory_version",
  title: "Factory",
  grp: "factories",
  format: FACTORY_FORMAT,
  listItem: (json) => ({ stations: json.line?.stations?.length ?? 0, parts: json.parts?.length ?? 0 }),
});

/** A factory's first version, as v1 (the deploy's import, ../import/factories.ts): only when play holds none of its id. */
export const seedFactory = (db: Db, o: { id: string; json: any; note: string; at?: Date }) => seedDoc(db, { kind: "factory", uuid: o.id, json: o.json, note: o.note, at: o.at });
