// Butler James's tools over MCP (intent a6ae861e; served by ./mcp.ts): Maia City's leads, each read, added or changed
// as an intent's work (./leads.ts), or as its own where no intent is named. Nothing here sends mail or calls.
import { addLead, leadOf, LEAD_FIELDS, listLeads, updateLead } from "./leads";
import type { Tool, ToolCtx } from "./mcptool";

const STAGES = "researched (found, not yet contacted), contacted_call, contacted_email, reached (talked or replied), meeting, offer, won, lost (with lost_reason)";
const FIRMS = "solo (one Makler), partners (1–3 partners), family (a family business), traditional (a Traditionsfirma), owner_run (inhabergeführt)";
const SOURCES = "form (it wrote to us), cold (we found it), referral, other";

/** a lead's fields as add_lead and update_lead take them */
const FIELDS: Record<(typeof LEAD_FIELDS)[number], Record<string, unknown>> = {
  company: { type: "string", description: "the firm's name, as it calls itself (only shown: a lead is named by its id)" },
  contact: { type: "string", description: "the person to speak to, only as the firm publishes them (Impressum, Team); never guessed" },
  email: { type: "string", description: "the contact email exactly as the firm publishes it on its own site (Impressum or Kontakt); never guessed or made up: leave it out if none is published" },
  website: { type: "string", description: "the firm's website, http(s): with its email what makes one firm one lead" },
  phone: { type: "string", description: "as published" },
  city: { type: "string" },
  region: { type: "string", description: "the Bundesland, e.g. Bayern" },
  firm: { type: "string", description: `what kind of firm: ${FIRMS}` },
  segment: { type: "string", description: "what it sells, e.g. 'Verkauf, Häuser und Wohnungen ab €500k'" },
  source: { type: "string", description: `how it came to us: ${SOURCES}` },
  stage: { type: "string", description: `where it stands in our pipeline, one of the lead schema's stages: ${STAGES}` },
  lost_reason: { type: "string", description: "why it was lost (a lost lead has one)" },
  next_step: { type: "string", description: "what we do next" },
  next_date: { type: "string", description: "when, YYYY-MM-DD" },
  notes: { type: "string", description: "Markdown: why it fits, what was said" },
  found_at: { type: "string", description: "the page its data was found on, http(s)" },
  do_not_contact: { type: "boolean", description: "true: contact it no more (it asked, or we may not: German UWG §7)" },
};

export const leadTools = ({ db, store }: ToolCtx): Tool[] => [
  {
    name: "list_leads",
    description:
      "Butler James, Maia City's CRM table: the leads, newest first, each its id (a UUID), company, contact, email, website, phone, city, region, firm, segment, source, stage, next step and date, notes, the page it was found on, do_not_contact, its version and a change of it that waits (intent). " +
      "stage, firm, source and region narrow it; q finds words in its company, contact, email, website, city, region, segment or notes. Look here before you add one: one firm is one lead.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "words to find" },
        stage: { type: "string", description: `one of ${STAGES}` },
        firm: { type: "string", description: `one of ${FIRMS}` },
        source: { type: "string", description: `one of ${SOURCES}` },
        region: { type: "string", description: "a Bundesland" },
        offset: { type: "integer", minimum: 0 },
        limit: { type: "integer", minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
    run: async (args, me) => listLeads(db, me, args),
  },
  {
    name: "get_lead",
    description: "One lead of Butler James, whole (doc_history shows every change of it).",
    inputSchema: { type: "object", properties: { lead: { type: "string", description: "the lead's id (a UUID: list_leads gives it)" } }, required: ["lead"], additionalProperties: false },
    run: async ({ lead }, me) => leadOf(db, me, lead),
  },
  {
    name: "add_lead",
    proposes: "own",
    description:
      "Keep a lead in Butler James: a firm Maia City may sell to, its contact as the firm publishes it, and where it stands in our pipeline (stage researched if none is given). " +
      "Give only what the firm publishes itself: an email or a person never guessed or made up, left out where none is published, and the page it was found on (found_at). " +
      "One firm is one lead (its website, else its email): one kept already answers with that lead and kept: true (change it with update_lead). " +
      "A lead is a document like any other: adding one proposes its first version as an intent's work. Named (`intent`), it is that intent's; left out, play makes the lead's own intent, which the auto-accept rules decide in the same call (Leads need no tap: kept at once, the answer at stage accepted). Nothing in Butler James sends mail or calls.",
    inputSchema: { type: "object", properties: FIELDS, required: ["company", "source"], additionalProperties: false },
    run: async ({ intent, ...args }, me) => addLead(db, store, me, args, intent),
  },
  {
    name: "update_lead",
    proposes: "own",
    description:
      "Change a kept lead: any of its fields (a stage moved on, a next step, a note, do_not_contact), each held to the same form as in add_lead; an empty string clears a field. " +
      "The change is its next version proposed as an intent's work: named (`intent`), the lead stays as it is until an admin accepts that intent; left out, play makes its own intent, which the auto-accept rules decide in the same call (Leads need no tap: changed at once). doc_history shows every change.",
    inputSchema: { type: "object", properties: { lead: { type: "string", description: "the lead's id (a UUID)" }, ...FIELDS }, required: ["lead"], additionalProperties: false },
    run: async ({ lead, intent, ...fields }, me) => updateLead(db, store, me, lead, fields, intent),
  },
];
