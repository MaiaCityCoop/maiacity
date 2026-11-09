// play's MCP server (/api/mcp, Streamable HTTP, stateless): an agent works on Maia City's assets, stories, factories,
// game configs and skills for an admin, by that admin's access token (./tokens.ts, `Authorization: Bearer play_…`).
// Everything play versions is versioned one way (./versioned.ts, play/SPEC.md "Version control"), by its document's
// UUID: list_docs, doc_at (a version, an edit, an intent's variant), doc_history (edits, versions, variants), doc_edit
// (one edit of an intent variant) and propose_doc_version. Each kind's own reads and creates stay where they hold more
// than the document: get_asset (its recipe files), get_story (its links), propose_asset and propose_story (a new one),
// and get_sandbox (a layout's pins by their assets). To propose is to put an intent at Proposal with that work (one record, the intent:
// ./work.ts, Samuel 2026-11-06), in the admin's name with `via` 'mcp'. Accepting stays a person's, on the intents'
// board (Samuel 2026-11-02): no tool here accepts. An agent may archive only its own intents at Proposal put there over
// MCP (archive_intent, Samuel 2026-11-04), one it no longer stands by. Everything on the board is an intent
// (./intents.ts): it adds intents (the only way in), specifies them (a goal, a scope, checks), records their checks'
// results while it builds an approved one, and names the intent in what it proposes (every propose tool's
// `intent`), play taking it only once every must check passes; once they all pass the intent moves to Proposal by
// itself, where a person decides it (Samuel 2026-11-06); approving a spec and accepting stay a person's.
// Every agent connected here is avenMAIA (play/SPEC.md §4.13, Samuel 2026-11-06), whatever its client or token: it keeps
// Maia City's artifacts (./artifacts.ts), every link its operator pastes (origin 'human') and every artifact it finds in
// its own research (origin 'agent'), each with its title, description, summary and authors.
// What it is taught is not written here: the system prompt (initialize's instructions), an intent's brief and the
// prompts are the skills', kept once in play's Postgres and changed only by proposal (./skills.ts, play/SPEC.md §4.14,
// Samuel 2026-11-06); a tool's description says only what it takes, gives back and refuses.
import type { BlobStore } from "./blobs";
import type { Db, Queryable } from "./kit/pg";
import { admin, type Me } from "./access";
import type { GitHub } from "./github";
import { assetOf, listAssets } from "./assets";
import { docAt, docEdit, docHistory, listDocs, proposeDocVersion } from "./versioned";
import { formatOf, kinds, syncKinds } from "./kinds";
import { NO_INTENT } from "./held";
import { getIntent, intentReady, noSuchIntent } from "./intents";
import { autoMove } from "./decide";
import { instructionsOf, promptOf, promptsOf } from "./skills";
import { adminByToken } from "./tokens";
import { STORY_ADMINS, AUDIO_TYPES, listStories, MOST_AUDIO, MOST_DOCUMENT, MOST_FRAME, MOST_VIDEO, MOST_COMPOSITION, proposeStory, putAudioBase64, putComposition, putDocument, putFrameBase64, putVideoBase64, slimLinks, storyAt, storyOf, VIDEO_TYPES } from "./stories";
import { assetAt, proposeAsset } from "./assetdocs";
import { GROUPS, isGroup } from "./groups";
import { listSandboxes, sandboxOf } from "./sandboxes";
import { LIBRARY_KINDS, listLibrary } from "./library";
import { delivery } from "./delivery";
import { fileHidden, LIBRARIES, libraryOf, maskEdges, seesIntent } from "./owners";

/** the library a file is added to: Maia City's (the default), or the operator's own personal one (./owners.ts) */
const LIBRARY_ARG = {
  type: "string",
  enum: [...LIBRARIES],
  description: "optional: the library it goes into: 'coop' (Maia City's, seen by every member; the default) or 'personal' (your operator's own, private to them: to anyone else it is as a file never kept), for their own character's photos and sheet",
};
import { HttpError } from "./kit/errors";
import type { Formats, Tool, ToolCtx } from "./mcptool";
import { intentTools } from "./intenttools";
import { artifactTools } from "./artifacttools";
import { statusOf } from "./fault";

const PROTOCOL = "2025-06-18";
const HASH = /^[0-9a-f]{64}$/;

/** what each kind's documents hold, as their schemas say it (./kinds.ts formatOf), read for every tools/list */
const formatsOf = async (q: Queryable): Promise<Formats> => ({
  recipe: await formatOf(q, "asset", "source"),
  story: await formatOf(q, "story"),
  all: (await Promise.all(kinds().filter((k) => k.told).map((k) => formatOf(q, k.name)))).join(" "),
});

/** the edits doc_edit and propose_doc_version take: a document's own, then each kind's (./kinds.ts Kind.edits) */
const editsText = () =>
  [
    "Edits, applied in order to the document: { op: 'set', path, value } (a field, or a list's item, replaced; a new field too), { op: 'insert', path, value } (into a list, before the index the path ends with; one past the end adds it last), { op: 'delete', path }, { op: 'move', path, to }, { op: 'text', path, index, delete?, insert? } (a range of a text). " +
    "A path is a list of field names and indexes, and an item of a list may be named by its id instead: ['line', 'stations', { id: 'weld' }, 'reserve'], ['parts', { id: 'floor' }, 'ops', 0, 's'], ['stages', 'build']. ",
    ...kinds().map((k) => k.edits),
  ]
    .filter(Boolean)
    .join("");

export function mcp({ db, store, github = null, commit }: { db: Db; store: BlobStore; github?: GitHub | null; commit?: string | null }) {
  // an intent that reached Specify or Proposal is asked of the auto-accept rules (./decide.ts autoMove, ./rules.ts)
  const auto = async <R extends Record<string, any>>(out: R, me: Me | null, id?: unknown): Promise<R> => {
    const intent = `${id ?? out?.intent ?? out?.id ?? ""}`;
    if (!intent) return out;
    const moved = await autoMove({ db, store }, intent, { me, gh: github, commit });
    if (!moved) return out;
    const now = await getIntent(db, intent);
    return { ...out, stage: now.stage, auto: now.auto, ...(moved.refused ? { auto_refused: moved.refused } : {}) };
  };
  const c: ToolCtx = { db, store, github, commit, auto };
  const tools: Tool[] = [
    {
      name: "list_assets",
      description: "Maia City's assets, and your own private ones: id (UUID), group, slug, label, head version and how many versions. Filter by group or by words in the label or slug.",
      inputSchema: {
        type: "object",
        properties: { group: { type: "string", enum: GROUPS }, query: { type: "string" } },
        additionalProperties: false,
      },
      run: async ({ group, query }, me) => {
        if (group !== undefined && !isGroup(group)) throw new HttpError(`${group} is not an asset group (${GROUPS.join(", ")}).`);
        const all = await listAssets(db, group, me);
        const q = `${query ?? ""}`.trim().toLowerCase();
        return all
          .filter((a: any) => !q || `${a.label} ${a.slug}`.toLowerCase().includes(q))
          .map((a: any) => ({ id: a.id, group: a.grp, slug: a.slug, label: a.label, head: a.head, versions: a.versions }));
      },
    },
    {
      name: "get_asset",
      description:
        "One asset by its id, with all its versions, newest first: each version's number, note, author, who accepted it, its recipe file's hash and its readable source's hash where it has one (and its variants'). " +
        "With `edit` (doc_history's `seq`), the asset as it was at that edit of its history instead, or with `intent`, as that intent's variant would make it: its whole source as text, its label, note, engine, card and variants.",
      inputSchema: {
        type: "object",
        properties: {
          asset: { type: "string", description: "the asset's id (UUID)" },
          edit: { type: "integer", minimum: 1, description: "an edit of its history (doc_history's `seq`)" },
          intent: { type: "string", description: "an intent's id: the asset as its intent variant would make it" },
        },
        required: ["asset"],
        additionalProperties: false,
      },
      run: async ({ asset, edit, intent }, me) =>
        intent ? assetAt(db, store, me, `${asset}`, { intent: `${intent}` }) : edit != null ? assetAt(db, store, me, `${asset}`, { edit: Number(edit) }) : assetOf(db, `${asset}`, me),
    },
    {
      name: "get_file",
      description: "A file's text by its BLAKE3 hash: a version's readable source or its recipe file (their hashes from get_asset).",
      inputSchema: { type: "object", properties: { hash: { type: "string", description: "64 hex characters" } }, required: ["hash"], additionalProperties: false },
      run: async ({ hash }, me) => {
        if (!HASH.test(`${hash}`)) throw new HttpError("That is not a file's hash.", 404);
        // another's private file is as one never kept (./owners.ts)
        if (await fileHidden(db, me, `${hash}`)) throw new HttpError("There is no such file.", 404);
        const bytes = await store.get(`${hash}`);
        if (!bytes) throw new HttpError("There is no such file.", 404);
        return { hash, text: new TextDecoder().decode(bytes) };
      },
    },
    {
      name: "delivery",
      description:
        "Read-only: where Maia City's intents' time goes, over the last `days` (7 by default, 1 to 30): each day's intents accepted with their median and longest Idea→Accepted and each stage's median; each intent open now or accepted in the window with its time at each stage (Idea and Build an agent's, Specify and Proposal waiting for a person, Ship CI's, with each ship step's time), its step backs, how many times play merged main into its pull request, and the budgets it went over and by how much (`budgets`). With `ci`, each intent's CI from GitHub: the runs of its pull request's branch and its ship's runs, their minutes, the share cancelled, each run's three slowest steps, runs over 10 minutes flagged. Also on /delivery/ and GET /api/delivery. Changes nothing.",
      inputSchema: {
        type: "object",
        properties: {
          days: { type: "integer", minimum: 1, maximum: 30, description: "optional: the window in days, today included (7 by default)" },
          ci: { type: "boolean", description: "optional: also read each intent's CI runs from GitHub (slower)" },
        },
        additionalProperties: false,
      },
      run: async ({ days, ci }, me) => delivery(db, me, github ?? null, { days, ci: ci === true }),
    },
    {
      name: "list_library",
      description:
        "The Library (/library/): every image, video, recording and document of a library, newest first: Maia City's (the coop's, `library` 'coop', as its admins see it; the default) or your operator's own personal one (`library` 'personal', private to them). Find a file by a part of its label or its hash's first characters (`q`), of one kind or all, a page at a time; each comes with its hash, size, media type, time, label (only shown) and where it is used (a story's shot or clip; an asset version's reference sheet, data sheet or brief). A file is named by its hash: fetch its bytes with GET /api/files/<hash> on play, sending this token as `Authorization: Bearer`. Labels are renamed only on the page.",
      inputSchema: {
        type: "object",
        properties: {
          library: { type: "string", enum: [...LIBRARIES], description: "optional: 'coop' (Maia City's, the default) or 'personal' (your operator's own, private to them)" },
          kind: { type: "string", enum: [...LIBRARY_KINDS], description: "optional: only files of this kind; every kind if left out" },
          q: { type: "string", description: "optional: a part of the label (any case) or the first characters of the hash" },
          offset: { type: "integer", minimum: 0, description: "optional: files to skip (0 by default)" },
          limit: { type: "integer", minimum: 1, maximum: 200, description: "optional: files in this page (60 by default, at most 200)" },
        },
        additionalProperties: false,
      },
      run: async ({ kind, q, offset, limit, library }, me) => listLibrary(db, me, { kind: kind ?? null, q: q ?? null, offset: offset ?? 0, limit: limit ?? 60, library }),
    },
    {
      name: "propose_asset",
      proposes: "required",
      description: (f) => `Propose a new asset, its first version. It puts an intent at Proposal with it (the intent you name, or a new one; via MCP), for Maia City's admins to decide. ${f.recipe}`,
      inputSchema: {
        type: "object",
        properties: {
          group: { type: "string", enum: GROUPS },
          label: { type: "string", description: "its name as shown. The asset gets a UUID of its own, which names it from then on; the label is only shown" },
          slug: { type: "string", description: "optional: a short lowercase name (words joined by '-') its recipe is called with; made from the label if left out. Only a name, never its id: two assets may share it" },
          source: { type: "string", description: "version 1's readable source (see above); left out where its `variants` each give their own" },
          note: { type: "string", description: "what it is and why, for the admins deciding" },
          variants: {
            type: "array",
            minItems: 1,
            maxItems: 16,
            description:
              "make the version a kind of variants (a plant's kinds, an animal's breeds), each selectable in the asset viewer: every variant is its own recipe file, built from its own `source` or else the version's, its recipe called with its name as `variant` (module.exports.recipe(id, v, variant)). A variant's `label` is how it is shown (\"Papaya: Male\" shows as Male).",
            items: {
              type: "object",
              properties: {
                name: { type: "string", pattern: "^[a-z0-9][a-z0-9-]{0,79}$", description: "lowercase, as a ref names it (plants/papaya@3:male)" },
                label: { type: "string" },
                source: { type: "string", description: "this variant's own readable source, where it differs from the version's" },
              },
              required: ["name"],
              additionalProperties: false,
            },
          },
          default_variant: { type: "string", description: "the variant a ref without one names (the first if left out)" },
          params: {
            type: "array",
            description:
              "the parameters its recipe declares (its meta.params: { id, label, type: 'number' | 'integer' | 'string', value, min?, max?, step?, names?, maxLength? }), in the order its build takes them. play runs no code, so it knows them only from here: a recipe that declares params and is proposed without them is refused",
            items: { type: "object" },
          },
          lod: {
            type: "object",
            description:
              "its levels of detail (required: every new version names them): { levels: 'declared' } where its recipe declares its own L1 and L2 (module.exports.levels = [{ values: { detail: 0.25 } }, { values: { detail: 0.1 } }], a plain literal, each the same recipe built with those values, which its params declare), else { levels: 'derived' } (L1 and L2 simplified from its build within the renderer's budgets); L0 is its build, L3 its picture. Optional `budgets`: the triangle counts it is held to, L0 first",
            properties: { levels: { type: "string", enum: ["declared", "derived"] }, budgets: { type: "array", items: { type: "integer", minimum: 1 }, maxItems: 4 } },
            required: ["levels"],
            additionalProperties: false,
          },
          sheet: { type: ["string", "null"], description: "its reference sheet: the hash of an image play keeps (add it first with add_story_frame, with a label for the Library), a plant's plate of every stage and organ made for it; shown with the version in the asset library and, in the Library, beside the image, the plant it belongs to. Carried on from the head unless given; null takes it away" },
          datasheet: { type: ["string", "null"], description: "its data sheet: the hash of a document play keeps (add_document), the researched numbers with every source. Shown with the version and, in the Library, beside the document. Carried on from the head unless given; null takes it away" },
          brief: { type: ["string", "null"], description: "the brief its reference sheet was made from: the hash of a document play keeps (add_document). Carried on from the head unless given; null takes it away" },
          private: { type: "boolean", description: "optional, group characters only: the asset is your operator's own, private to them (seen, read and decided by them alone, everywhere in play; no sandbox may pin it); its files and documents may be their personal library's. Everyone's (Maia City's) if left out" },
        },
        required: ["group", "label", "note"],
        additionalProperties: false,
      },
      run: async ({ group, slug, label, source, note, variants, default_variant, params, sheet, datasheet, brief, intent, private: own, lod }, me) => {
        const kinds = Array.isArray(variants) && variants.length ? variants : null;
        if (!source && !kinds) throw new HttpError("Give its source, or its variants.");
        // play runs no code: a recipe's declared params reach its record only from here (a build with values is refused without them)
        const texts = [source, ...(kinds ?? []).map((x: any) => x?.source)].filter((x) => typeof x === "string");
        if (params === undefined && texts.some((x) => /\bparams\s*:\s*(\[|[A-Za-z_$])/.test(x) && !/\bparams\s*:\s*\[\s*\]/.test(x)))
          throw new HttpError("Its recipe declares parameters (meta.params): give them as `params`, in the order its build takes them, or its builds with values are refused.");
        if (kinds && kinds.some((x: any) => !x?.source) && !source) throw new HttpError("Give the version's source, or each variant's own.");
        return proposeAsset(
          db,
          store,
          me,
          {
            new: { group, slug, label, ...(own !== undefined ? { private: own } : {}) },
            ...(params !== undefined || lod !== undefined ? { card: { ...(params !== undefined ? { params } : {}), ...(lod !== undefined ? { lod } : {}) } } : {}),
            ...(kinds
              ? { variants: Object.fromEntries(kinds.map((x: any) => [`${x.name}`, { source: `${x.source ?? source ?? ""}`, ...(x.label !== undefined ? { label: `${x.label}` } : {}) }])), ...(default_variant ? { defaultVariant: `${default_variant}` } : {}) }
              : { source: `${source}` }),
            note,
            ...(sheet !== undefined ? { sheet } : {}),
            ...(datasheet !== undefined ? { datasheet } : {}),
            ...(brief !== undefined ? { brief } : {}),
            ...(intent ? { intent } : {}),
          },
          "mcp",
        );
      },
    },
    // ---- one version control (./versioned.ts, play/SPEC.md "Version control"): every versioned kind, by its document's UUID
    {
      name: "list_docs",
      description: `Every document play versions, of one kind or all: an asset, a story, a factory, a game config (the levelling), a skill, a sandbox's layout, a schema (every schema is a document of the meta-schema), and every kind that is a schema alone. Each with its UUID (what names it everywhere), its kind, its label (only shown), its newest version's number and how many versions; a factory also its stations and parts, a skill its group and the stages it speaks to, a sandbox's layout how many pins and its configs' names, a schema the prefix of its documents.`,
      // the kinds as play holds them when the tools are listed: a schema accepted since is a kind too
      get inputSchema() {
        return { type: "object", properties: { kind: { type: "string", enum: kinds().map((k) => k.name), description: "one kind only" } }, additionalProperties: false };
      },
      run: async ({ kind }, me) => listDocs(db, me, kind),
    },
    {
      name: "doc_at",
      description: (f) => `One document whole (its \`json\`), at Main's newest version, at an accepted version, at an edit of its history (doc_history's \`seq\`), or as an intent's variant would make it; with its versions. ${f.all}`,
      inputSchema: {
        type: "object",
        properties: {
          doc: { type: "string", description: "its UUID (list_docs)" },
          version: { type: "integer", minimum: 1, description: "an accepted version's number; Main's newest if left out" },
          edit: { type: "integer", minimum: 1, description: "an edit of its history (doc_history's `seq`), instead of a version" },
          intent: { type: "string", description: "an intent's id: the document as its intent variant would make it" },
          breed: { type: "integer", minimum: 1, description: "an asset's breed (doc_history's variants of type breed, by number): the breed as it is now, Main beneath it on every field it does not override" },
        },
        required: ["doc"],
        additionalProperties: false,
      },
      run: async ({ doc, version, edit, intent, breed }, me) => docAt({ db, store }, me, doc, { version, edit, intent, ...(breed != null ? { breed: Number(breed) } : {}) }),
    },
    {
      name: "doc_history",
      description:
        "A document's history: its edits, oldest first (each with its seq, its variant, who made it and whether over MCP, its message, its time, and the version it was named, if one; Main's edits, with each accepted intent variant's where it was made, a merge where one went in), its versions, and its variants (Main; an asset's breeds, each with its name and the fields it overrides; then each intent variant with its status, its seed, the breed it changes or makes, its intent and how many edits it holds). With `variant`, one variant's own edits (a breed's: its own and every edit of Main merged into it). Read any edit's state with doc_at's `edit`.",
      inputSchema: {
        type: "object",
        properties: { doc: { type: "string", description: "its UUID" }, variant: { type: "integer", minimum: 1, description: "an intent variant's number, for its own edits" } },
        required: ["doc"],
        additionalProperties: false,
      },
      run: async ({ doc, variant }, me) => docHistory({ db, store }, me, doc, variant == null ? {} : { variant: Number(variant) }),
    },
    {
      name: "doc_edit",
      description:
        `One edit of an intent variant, for the intent it is made for (\`intent\`: no edit without one, and nothing reaches the document's Main but an admin's Accept of that intent at Proposal), kept with its message: work on a document edit by edit (each fix, each tuning its own edit, so the history shows how it was made), then propose the variant with propose_doc_version and its \`variant\`. Without \`variant\` it goes on the intent's open variant of this document, or starts a new one seeded from Main's newest version, and gives back its number. One intent may change several documents: edit each for it, and propose each naming it; they are accepted together or archived together. Every edit is checked whole, and nobody sees an intent variant as the document until it is proposed and accepted. ${editsText()} Or give the whole document (\`whole\`, doc_at's \`json\` changed).`,
      inputSchema: {
        type: "object",
        properties: {
          doc: { type: "string", description: "its UUID; left out with `kind` and `whole`, a new document of that kind" },
          kind: { type: "string", description: "a new document's kind (list_docs's kinds): a schema, or a kind that is a schema alone; its first state is `whole`" },
          intent: { type: "string", description: "the intent this edit is made for, by its id (a UUID: add_intent makes one): in Build, or waiting at Proposal" },
          message: { type: "string", description: "what this edit does, as its history will say it" },
          variant: { type: "integer", minimum: 1, description: "the intent variant to add the edit to (doc_edit gives it); a new one seeded from Main's newest version if left out" },
          breed: { type: "integer", minimum: 1, description: "with no `variant`: start the intent variant from this breed of the asset's (its number), to change the breed; it changes only the breed's `source` and `card`" },
          new_breed: { type: "string", description: "with no `variant`: start an intent variant that makes a new breed of the asset's, of this name (lowercase words joined by '-'), seeded from Main" },
          edits: { type: "array", items: { type: "object" }, description: "edits applied in order" },
          whole: { type: "object", description: "the whole new document (instead of edits)" },
        },
        required: ["intent", "message"],
        additionalProperties: false,
      },
      run: async ({ doc, kind, intent, message, variant, breed, new_breed, edits, whole }, me) =>
        docEdit({ db, store }, me, { doc, kind, intent, message, edits, whole, ...(variant != null ? { variant: Number(variant) } : {}), ...(breed != null ? { breed: Number(breed) } : {}), ...(new_breed != null ? { newBreed: `${new_breed}` } : {}) }),
    },
    {
      name: "propose_doc_version",
      proposes: "required",
      description:
        (f) => `Propose a document's next version: an intent variant made edit by edit with doc_edit (its \`variant\`; its edits go with it), or edits applied at once to Main's newest version, or the whole document. ${editsText()} It puts an intent at Proposal with it (via MCP), for Maia City's admins, who see what changed field by field on the intents' board (an asset built in the asset box, a story played in the Stories player, a factory opened with its simulation running) and accept or archive it. An asset's version is checked as readable source when it is proposed: ${f.recipe} If Main gets a newer version first, it still goes in where the two changes touch different fields, and is archived where they touch the same (an asset's, whenever its head moved). With \`kind\` and \`whole\` and no \`doc\`, a new document: a schema (every schema is a document of the meta-schema: \`label\`, \`type\` its documents' prefix, \`name\`, \`node\` the JSON Schema it holds them to; once accepted, its documents are a kind of their own, listed, read, edited and proposed with these same tools), or a document of a kind that is a schema alone. A schema's new version is accepted only while every document on Main still validates against it: the Accept names those that would not. An asset's breeds (doc_history) live beside Main and take every change accepted on Main except on the fields they override: change one with \`breed\` (an intent variant seeded from it), make one with \`new_breed\`; either Accept makes the asset's next version, every breed built as its variant.`,
      inputSchema: {
        type: "object",
        properties: {
          doc: { type: "string", description: "its UUID; left out with `kind` and `whole`, a new document of that kind, its first version" },
          kind: { type: "string", description: "a new document's kind (list_docs's kinds): a schema (a new type of document, its documents' prefix its `type`), or a kind that is a schema alone" },
          note: { type: "string", description: "what changes and why, for the admins deciding" },
          variant: { type: "integer", minimum: 1, description: "an intent variant to propose (doc_edit gives it)" },
          breed: { type: "integer", minimum: 1, description: "with no `variant`: the edits change this breed of the asset's (its number), not Main" },
          new_breed: { type: "string", description: "with no `variant`: the edits make a new breed of the asset's, of this name" },
          edits: { type: "array", items: { type: "object" }, description: "edits applied in order (to the intent variant, if one is named)" },
          whole: { type: "object", description: "the whole new document (instead of edits)" },
        },
        required: ["note"],
        additionalProperties: false,
      },
      run: async ({ doc, kind, note, variant, breed, new_breed, edits, whole, intent }, me) =>
        proposeDocVersion({ db, store }, me, { doc, kind, note, edits, whole, intent, ...(variant != null ? { variant: Number(variant) } : {}), ...(breed != null ? { breed: Number(breed) } : {}), ...(new_breed != null ? { newBreed: `${new_breed}` } : {}) }),
    },
    // ---- sandboxes: what each draws (its pins) and how it lays them out (its configs): its layout, a document (./sandboxes.ts)
    {
      name: "list_sandboxes",
      description: "Maia City's sandboxes (and the Factories, which keep their pins the same way): id, title, route on play, how many pins and the names of their configs.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async (_args, me) => listSandboxes(db, me),
    },
    {
      name: "get_sandbox",
      description:
        "One sandbox's layout as it stands. Its pins: each slot it draws, with the asset (id, group, slug, label), the version it pins and the asset's newest (`latest`), its variant (none: the version's default) and the variants it has, its values (params), and where its configs name the slot (`usedBy`). " +
        "Its configs whole, by name (Sandbox 1's `garden`: its layers of plantings, each { id, slot, stages, weight, … }, its spacing, drift and fields): anything in a config with a `slot` is drawn as that slot's pin. Its layout is a document named by the sandbox's UUID: read its versions and edits with doc_history and doc_at, and change any of it by an intent variant, doc_edit and propose_doc_version, with its pin, pin_latest, unpin, set and delete.",
      inputSchema: { type: "object", properties: { sandbox: { type: "string", description: "its id, a UUID (list_sandboxes)" } }, required: ["sandbox"], additionalProperties: false },
      run: async ({ sandbox }, me) => sandboxOf(db, me, `${sandbox ?? ""}`),
    },
    // ---- stories: a film as one timeline of tracks and clips (./stories.ts, play/SPEC.md §12)
    {
      name: "list_stories",
      description: "Maia City's stories (films as timelines, played on play's Stories page): id, title, head version number, how many accepted versions, duration in seconds, how many shots and tracks.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async (_args, me) => listStories(db, me),
    },
    {
      name: "get_story",
      description: (f) => `One story's whole timeline, at its head, at an accepted version, at any edit of its history (doc_history lists them), or as an intent's variant would make it: ${f.story} At its head or a version it also lists the story's versions (number, id, note, author, who accepted it). Use its \`version\` as \`base\` when you propose a change. ` +
        "Its `links` are the versions it links, to any depth, each under the version's id: { id (the linked story's), title, number, version, duration, newest (that story's newest accepted number: where it is higher, a newer version is there to move to by set_clip) }; with `links: true` each also with its whole timeline (body). Its `linked_by` are the stories whose newest version links this one, each with the number of this one's version it plays.",
      inputSchema: {
        type: "object",
        properties: {
          story: { type: "string", description: "the story's id, a UUID (list_stories)" },
          version: { type: "integer", minimum: 1, description: "an accepted version's number; the head if left out" },
          edit: { type: "integer", minimum: 1, description: "an edit of its history (doc_history's `seq`), instead of a version" },
          intent: { type: "string", description: "an intent's id: the story as its intent variant would make it" },
          links: { type: "boolean", description: "true: each linked story's whole timeline too (left out: only its title, number, version and duration)" },
        },
        required: ["story"],
        additionalProperties: false,
      },
      run: async ({ story, version, edit, intent, links }, me) => {
        const id = `${story ?? ""}`;
        const s: any = await (intent ? storyAt(db, me, id, { intent: `${intent}` }) : edit != null ? storyAt(db, me, id, { edit: Number(edit) }) : storyOf(db, me, id, version == null ? undefined : Number(version)));
        return links === true ? s : { ...s, links: slimLinks(s.links) };
      },
    },
    {
      name: "propose_story",
      proposes: "required",
      description: (f) => `Propose a new story, its first version, as its whole timeline. It gets a UUID of its own (the answer's story), which names it from then on; its title is only shown. It puts an intent at Proposal with it (via MCP), for Maia City's admins, who play it in the Stories player on the intents' board and accept or archive it. ${f.story} Add each storyboard image first with add_story_frame and use the hashes it gives as the shots' frames.`,
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "its title as shown" },
          body: { type: "object", description: "the timeline: { format, fps, tracks: [{ id, kind, clips: [{ id, at, duration, … }] }] }" },
          note: { type: "string", description: "what it is and why, for the admins deciding" },
        },
        required: ["title", "body", "note"],
        additionalProperties: false,
      },
      run: async ({ title, body, note, intent }, me) => proposeStory(db, me, { title, body, note, intent }, true),
    },
    {
      name: "add_story_frame",
      description: `Add a storyboard image (a JPEG, PNG or WebP, at most ${MOST_FRAME / 1e6} MB) as base64. play keeps it among its files and gives back its BLAKE3 hash, to use as a shot's \`frame\` in propose_story or propose_doc_version. The same image always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { data: { type: "string", description: "the image's bytes as base64 (a data: URL's prefix is allowed)" }, media_type: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] }, label: { type: "string", description: "a short label for the Library (where it came from, what it shows); only shown, the file is named by its hash" }, library: LIBRARY_ARG },
        required: ["data", "media_type"],
        additionalProperties: false,
      },
      run: async ({ data, media_type, label, library }, me) => (admin(me, STORY_ADMINS), putFrameBase64(db, store, data, media_type, label, libraryOf(me, library).owner)),
    },
    {
      name: "add_story_video",
      description: `Add a video (an MP4 or WebM, at most ${MOST_VIDEO / 1e6} MB) as base64: a shot's moving picture, e.g. an image-to-video clip made from its frame. play keeps it among its files and gives back its BLAKE3 hash, to use as a shot's \`video\` (with \`video_in\`, where in it the shot starts) in propose_story, doc_edit or propose_doc_version. The Stories player plays it muted in the shot, the story's own sound under it, and shows the shot's frame until it can play. The same video always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { data: { type: "string", description: "the video's bytes as base64 (a data: URL's prefix is allowed)" }, media_type: { type: "string", enum: VIDEO_TYPES }, label: { type: "string", description: "a short label for the Library (where it came from, what it shows); only shown, the file is named by its hash" } },
        required: ["data", "media_type"],
        additionalProperties: false,
      },
      run: async ({ data, media_type, label }, me) => (admin(me, STORY_ADMINS), putVideoBase64(db, store, data, media_type, label)),
    },
    {
      name: "add_story_composition",
      description: `Add a composition (readable HTML, at most ${MOST_COMPOSITION / 1e6} MB): a shot's motion design as one HyperFrames composition, a root with its data-composition-id and its GSAP timeline registered on window.__timelines, as written (never bundled or minified). It loads nothing from outside play: GSAP and HyperFrames' runtime come from play, so leave out the scripts that load them. play keeps it among its files, served as plain text like every code file, and gives back its BLAKE3 hash, to use as a shot's \`composition\` in propose_story, doc_edit or propose_doc_version: the story is compiled into one composition (play/SPEC.md §12) where it plays in the shot's place, from its 0 at the shot's at, for the shot's length, in the Stories player's sealed frame and in HyperFrames' render alike. The same HTML always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { html: { type: "string", description: "the composition's HTML, as written" }, label: { type: "string", description: "a short label for the Library (what it shows); only shown, the file is named by its hash" }, library: LIBRARY_ARG },
        required: ["html"],
        additionalProperties: false,
      },
      run: async ({ html, label, library }, me) => (admin(me, STORY_ADMINS), putComposition(db, store, html, label, libraryOf(me, library).owner)),
    },
    {
      name: "add_document",
      description: `Add a document (Markdown text, at most ${MOST_DOCUMENT / 1e6} MB): a plant's data sheet (its researched numbers, every row with its source) or the brief its reference sheet was made from. play keeps it among its files, shown in the Library with its label, and gives back its BLAKE3 hash, to name as a version's \`datasheet\` or \`brief\` in propose_doc_version or propose_asset (play/SPEC.md §4.10). The same text always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { text: { type: "string", description: "the document as Markdown text" }, label: { type: "string", description: "a short label for the Library (\"Data sheet · Plum 'Hauszwetschge'\"); only shown, the file is named by its hash" }, library: LIBRARY_ARG },
        required: ["text"],
        additionalProperties: false,
      },
      run: async ({ text, label, library }, me) => (admin(me, STORY_ADMINS), putDocument(db, store, text, label, libraryOf(me, library).owner)),
    },
    {
      name: "add_story_audio",
      description: `Add a recording (MP3, WAV, Ogg, FLAC, M4A or WebM audio, at most ${MOST_AUDIO / 1e6} MB) as base64: a voice take, a music cue, a sound effect, an ambience bed or a whole mix. play keeps it among its files and gives back its BLAKE3 hash, to use as a clip's \`audio\` in propose_story, doc_edit or propose_doc_version. The same recording always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { data: { type: "string", description: "the recording's bytes as base64 (a data: URL's prefix is allowed)" }, media_type: { type: "string", enum: AUDIO_TYPES }, label: { type: "string", description: "a short label for the Library (where it came from, what it shows); only shown, the file is named by its hash" } },
        required: ["data", "media_type"],
        additionalProperties: false,
      },
      run: async ({ data, media_type, label }, me) => (admin(me, STORY_ADMINS), putAudioBase64(db, store, data, media_type, label)),
    },
    // ---- intents (./intents.ts): everything on the board, Idea → Specify → Build → Proposal → Accepted or Archived
    ...intentTools(c),
    // ---- artifacts (./artifacts.ts, play/SPEC.md §4.13): Maia City's library of links, kept by avenMAIA
    ...artifactTools(c),
  ];

  // to propose is to put an intent at Proposal (play/SPEC.md §4.12): no work without an intent. Work names its intent,
  // held to its gate first (its spec approved and every must check passed, ./intents.ts intentReady), and replaces any
  // work it held; without one nothing is taken. Every propose tool gives back the intent (`intent`, at stage proposal)
  for (const t of tools) {
    if (!t.proposes) continue;
    // an artifact added or corrected without one makes its own (./artifacts.ts): the first rule needs no tap for it
    const own = t.proposes === "own";
    (t.inputSchema.properties as Record<string, unknown>).intent = {
      type: "string",
      description: "the intent this is the work of, by its id (a UUID: list_intents gives it), in Build or at Proposal: its spec approved and every must check passed (check_intent), or nothing is proposed; it moves to Proposal with this work, replacing any it held. No work without an intent: add_intent adds one, specify_intent specifies it",
    };
    const req = (t.inputSchema.required ??= []) as string[];
    if (!req.includes("intent") && !own) req.push("intent");
    if (own)
      (t.inputSchema.properties as Record<string, any>).intent.description =
        "the intent this is the work of, by its id (a UUID), in Build or at Proposal with every must check passed, held to its gate. Left out, it makes its own: an intent declaring the artifact, its spec play's, approved and accepted in the same request where a rule matches (the first: artifacts need no tap), else waiting for a person";
    const run = t.run;
    t.run = async ({ intent, ...args }, me) => {
      if (intent === undefined || intent === null || intent === "") {
        if (own) return run(args, me);
        throw new HttpError(NO_INTENT, 400);
      }
      const ready = await intentReady(db, me, intent);
      // its work proposed, the intent at Proposal: asked of the rules
      return auto((await run({ ...args, intent: ready.id }, me)) as Record<string, any>, me, ready.id);
    };
  }

  const reply = (id: unknown, result: unknown) => Response.json({ jsonrpc: "2.0", id, result });
  const fail = (id: unknown, code: number, message: string, status = 200) => Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status });

  return async function handle(req: Request): Promise<Response> {
    if (req.method !== "POST") return new Response("play's MCP server takes JSON-RPC by POST.", { status: 405, headers: { Allow: "POST" } });
    const me = await adminByToken(db, req);
    if (!me)
      return Response.json(
        { error: "An admin's access token is needed (Authorization: Bearer play_…), made on play's profile page." },
        { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="play.maia.city"' } },
      );
    let msg: any;
    try {
      msg = await req.json();
    } catch {
      return fail(null, -32700, "That is not JSON.", 400);
    }
    if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return fail(msg?.id, -32600, "Not a JSON-RPC 2.0 request.", 400);
    // a notification (no id) is taken and needs no answer
    if (msg.id === undefined) return new Response(null, { status: 202 });
    switch (msg.method) {
      case "initialize":
        // the system prompt is the system skills' parts as accepted (./skills.ts), read on each request: an accepted
        // version teaches the next agent that connects, with no deploy
        return reply(msg.id, {
          protocolVersion: PROTOCOL,
          capabilities: { tools: {}, prompts: {} },
          serverInfo: { name: "play.maia.city", title: "play.maia.city, for avenMAIA", version: "1" },
          instructions: await instructionsOf(db),
        });
      case "ping":
        return reply(msg.id, {});
      case "prompts/list":
        return reply(msg.id, { prompts: await promptsOf(db) });
      case "prompts/get":
        try {
          return reply(msg.id, await promptOf(db, msg.params?.name, msg.params?.arguments));
        } catch (e) {
          if (statusOf(e) !== null) return fail(msg.id, -32602, (e as Error).message);
          throw e;
        }
      case "tools/list":
        await syncKinds(db);
        const f = await formatsOf(db);
        return reply(msg.id, { tools: tools.map(({ name, description, inputSchema }) => ({ name, description: typeof description === "string" ? description : description(f), inputSchema })) });
      case "tools/call": {
        const tool = tools.find((t) => t.name === msg.params?.name);
        if (!tool) return fail(msg.id, -32602, `There is no tool ${msg.params?.name}.`);
        try {
          // an intent whose work is another's private asset is as one that never was, whichever tool names it (./owners.ts)
          const named = msg.params?.arguments?.intent;
          if (typeof named === "string" && me && !(await seesIntent(db, me, named))) throw noSuchIntent();
          // (an edge to an intent another's private work keeps is shown as "a private intent": ./owners.ts)
          const out = await maskEdges(db, me, await tool.run(msg.params?.arguments ?? {}, me));
          return reply(msg.id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: Array.isArray(out) ? { items: out } : out });
        } catch (e) {
          // what went wrong, as the tool's own answer the agent reads (a refused recipe, a moved head, no such asset)
          if (statusOf(e) !== null)
            return reply(msg.id, { content: [{ type: "text", text: (e as Error).message }], isError: true });
          console.error(e);
          return reply(msg.id, { content: [{ type: "text", text: "Something went wrong on play's side." }], isError: true });
        }
      }
      default:
        return fail(msg.id, -32601, `There is no method ${msg.method}.`);
    }
  };
}
