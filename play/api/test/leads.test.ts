// Butler James (src/leads.ts, intent a6ae861e): Maia City's CRM table of leads, over MCP, against a real Postgres.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { type Db } from "../src/kit/pg";
import { RULE, RULES, SCHEMA } from "../src/kit/ids";
import { FIRST_RULE, LEADS_RULE, RULES_V1 } from "../src/rules";
import { seedSkills } from "../import/skills";
import { type Api, appOn, type Fresh, freshDb, human, request, rpc, suite, tempStore, tool as mcpTool } from "./kit";
import * as fx from "./fixtures/intents";

const LEAD = (over: Record<string, unknown> = {}) => ({
  company: "Muster Immobilien",
  contact: "Erika Muster",
  email: "Info@Muster-Immobilien.example",
  website: "https://www.Muster-Immobilien.example/",
  city: "München",
  region: "Bayern",
  firm: "family",
  segment: "Verkauf, Häuser und Wohnungen ab €500k",
  source: "cold",
  found_at: "https://www.muster-immobilien.example/impressum",
  notes: "Family firm since 1972, selling only.",
  ...over,
});

suite("leads", () => {
  let f: Fresh, db: Db, api: Api;
  const who: Record<string, { id: string; cookie: string }> = {};
  const tokens: Record<string, string> = {};

  beforeAll(async () => {
    f = await freshDb();
    db = f.db;
    await seedSkills(db);
    api = appOn(db, { store: tempStore() });
    for (const [n, level] of [["Samuel", "admin"], ["cit", "citizen"]] as const) who[n] = await human(db, n, level);
    tokens.Samuel = (await call("Samuel", "POST", "/api/tokens", { name: "agent" })).data.token;
  });
  afterAll(async () => {
    await f?.drop();
  });

  const call = (as: string, method: string, path: string, body?: unknown) => request(api, { cookie: who[as].cookie }, method, path, body);
  const tool = (name: string, args: Record<string, unknown>): Promise<any> => mcpTool(api, tokens.Samuel, name, args);
  const readyIntent = (title: string, work_kind?: string[]) =>
    fx.readyIntent({ tool, approve: (id) => call("Samuel", "POST", `/api/intents/${id}/approve`) }, title, { spec: fx.spec("It is kept.", "One lead."), ...(work_kind ? { add: { work_kind } } : {}) });
  /** a lead added for a ready intent and accepted on the board */
  const keep = async (args: Record<string, unknown>) => {
    const r = await tool("add_lead", { ...args, intent: await readyIntent(`Keep ${args.company}`) });
    if (r.error || r.kept) return r;
    expect((await call("Samuel", "POST", `/api/intents/${r.intent}/accept`)).data.stage).toBe("accepted");
    return tool("get_lead", { lead: r.id });
  };
  const setRules = async (rules: unknown[]) => {
    const i = await readyIntent("The rules for a test", [SCHEMA.rules]);
    expect((await tool("propose_doc_version", { doc: RULES, whole: { ...RULES_V1, rules }, note: "the rules for a test", intent: i })).error).toBeUndefined();
    expect((await call("Samuel", "POST", `/api/intents/${i}/accept`)).data.stage).toBe("accepted");
  };

  test("the lead schema is seeded, a kind of its own, and its tools are served", async () => {
    const schemas = await tool("list_docs", { kind: "schema" });
    expect(schemas.find((s: any) => s.id === SCHEMA.lead)).toMatchObject({ type: "lead", label: "Lead" });
    const names = (await rpc(api, tokens.Samuel, "tools/list")).json.result.tools.map((t: any) => t.name);
    for (const t of ["list_leads", "get_lead", "add_lead", "update_lead"]) expect(names).toContain(t);
  });

  test("a lead is added, read and listed with filters; one firm is kept once", async () => {
    const a = await keep(LEAD());
    expect(a).toMatchObject({ company: "Muster Immobilien", email: "info@muster-immobilien.example", website: "https://www.muster-immobilien.example", stage: "researched", source: "cold", firm: "family", do_not_contact: false, version: 1 });
    expect(a.operator).toBe(who.Samuel.id);
    await keep(LEAD({ company: "Haus am See Makler", email: "", website: "https://haus-am-see.example", city: "Starnberg", firm: "solo", source: "form" }));
    await keep(LEAD({ company: "Nordlicht Immobilien", email: "kontakt@nordlicht.example", website: "https://nordlicht.example", city: "Hamburg", region: "Hamburg", firm: "partners" }));
    expect((await tool("list_leads", {})).total).toBe(3);
    expect((await tool("list_leads", { region: "hamburg" })).items.map((l: any) => l.company)).toEqual(["Nordlicht Immobilien"]);
    expect((await tool("list_leads", { firm: "solo" })).items.map((l: any) => l.company)).toEqual(["Haus am See Makler"]);
    expect((await tool("list_leads", { source: "cold", stage: "researched" })).total).toBe(2);
    expect((await tool("list_leads", { q: "starnberg" })).items.map((l: any) => l.company)).toEqual(["Haus am See Makler"]);
    expect((await tool("list_leads", { limit: 1, offset: 1 })).items.length).toBe(1);
    // the same website, written another way: the lead kept, nothing new
    const again = await tool("add_lead", { ...LEAD({ company: "Muster again" }), website: "https://www.muster-immobilien.example", intent: await readyIntent("Muster again") });
    expect(again).toMatchObject({ kept: true, id: a.id });
    expect((await tool("list_leads", {})).total).toBe(3);
    // and over HTTP for the page
    const page = (await call("Samuel", "GET", "/api/leads?stage=researched")).data;
    expect(page.total).toBe(3);
    expect((await call("Samuel", "GET", `/api/leads/${a.id}`)).data.company).toBe("Muster Immobilien");
  });

  test("a stage outside the pipeline, a lost lead without its reason and a made-up email are refused", async () => {
    const i = await readyIntent("A bad stage");
    expect((await tool("add_lead", { ...LEAD({ website: "https://bad.example" }), stage: "foo", intent: i })).error).toMatch(/researched.*contacted_call.*lost/);
    expect((await tool("add_lead", { ...LEAD({ website: "https://lost.example" }), stage: "lost", intent: i })).error).toContain("lost_reason");
    expect((await tool("add_lead", { ...LEAD({ website: "https://mail.example" }), email: "not an email", intent: i })).error).toContain("not an email address");
    expect((await tool("add_lead", { ...LEAD({ website: "https://firm.example" }), firm: "chain", intent: i })).error).toContain("solo");
  });

  test("only admins see leads", async () => {
    expect((await call("cit", "GET", "/api/leads")).status).toBe(403);
    const citToken = (await call("cit", "POST", "/api/tokens", { name: "agent" })).data?.token;
    if (citToken) expect((await mcpTool(api, citToken, "list_leads", {})).error).toBeTruthy();
  });

  test("no tap: with the rule in force a lead added and changed over MCP is kept at once, each change in its History", async () => {
    // only v1's rule: the lead's own intent waits for a person (at Approve spec, as an artifact's does)
    const waits = await tool("add_lead", LEAD({ company: "Wartet Immobilien", website: "https://wartet.example" }));
    expect(waits).toMatchObject({ waiting: true, stage: "specify" });
    expect((await tool("get_intent", { intent: waits.intent })).work_kind).toEqual([SCHEMA.lead]);
    expect((await tool("list_leads", { q: "wartet" })).total).toBe(0);
    // the second rule accepted, as this intent's work is: kept at once
    await setRules([FIRST_RULE, LEADS_RULE]);
    const r = await tool("add_lead", LEAD({ company: "Sofort Immobilien", website: "https://sofort.example" }));
    expect(r).toMatchObject({ stage: "accepted", waiting: false, company: "Sofort Immobilien" });
    const i = await tool("get_intent", { intent: r.intent });
    expect([i.stage, i.auto?.accept?.rule, i.decided_by]).toEqual(["accepted", RULE.leads, null]);
    const u = await tool("update_lead", { lead: r.id, stage: "contacted_call", next_step: "Call again", next_date: "2100-01-08" });
    expect(u).toMatchObject({ stage: "accepted", waiting: false, next_step: "Call again", version: 2 });
    expect((await tool("get_lead", { lead: r.id })).stage).toBe("contacted_call");
    const h = await tool("doc_history", { doc: r.id });
    expect(h.versions.map((v: any) => v.number)).toEqual([1, 2]);
    expect(h.edits.filter((e: any) => e.variant !== null).every((e: any) => e.author === "Samuel" && e.via === "mcp")).toBe(true);
    // a lost lead without its reason: refused, the lead as it was
    expect((await tool("update_lead", { lead: r.id, stage: "lost" })).error).toContain("lost_reason");
    expect((await tool("get_lead", { lead: r.id })).version).toBe(2);
  });
});
