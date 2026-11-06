// play's MCP server (/api/mcp, Streamable HTTP, stateless): an agent works on Maia City's documents for an admin, by
// that admin's access token (./tokens.ts, `Authorization: Bearer play_…`). Every versioned document, of every kind (an
// asset, a story, a factory, a game config, a skill), is read, drafted edit by edit in an intent variant and proposed
// through one set of tools (list_docs, doc_at, doc_history, doc_edit, propose_doc_version; ./versioned.ts, play/SPEC.md
// "Version control"); a kind keeps only its own reads and creates (an asset's recipe files, a new asset, a story's
// links, a new story). To propose is to put an intent at Proposal with that work (one record, the intent: ./work.ts,
// Samuel 2026-11-06), in the admin's name with `via` 'mcp'; every change waits there for a person's Accept, and no tool
// here accepts. An agent may archive only its own intents at Proposal put there over MCP (archive_intent, Samuel
// 2026-11-04). Everything on the board is an intent (./intents.ts): it adds intents (the only way in), specifies them
// (a goal, a scope, checks), records their checks' results while it prototypes an approved one, and names the intent in
// what it proposes (every propose tool's `intent`), play taking it only once every must check passes.
// Every agent connected here is avenMAIA (play/SPEC.md §4.13, Samuel 2026-11-06), whatever its client or token: it keeps
// Maia City's artifacts (./artifacts.ts), every link its operator pastes (origin 'human') and every artifact it finds in
// its own research (origin 'agent'), each with its title, description, summary and authors.
// What it is taught is not written here: the system prompt (initialize's instructions), an intent's brief and the
// prompts are the skills', kept once in play's Postgres and changed only by proposal (./skills.ts, play/SPEC.md §4.14,
// Samuel 2026-11-06); a tool's description says only what it takes, gives back and refuses.
import type { BlobStore } from "./blobs";
import type { Db } from "./pg";
import type { Me } from "./access";
import { assetOf, listAssets, NotFound } from "./assets";
import "./kinds";
import { propose } from "./assetversions";
import { WorkError } from "./work";
import { archiveOwn, docAt, docChanges, docHistory, editDoc, kinds, listDocs, proposeDoc, reviewOf, VersionError, workKinds } from "./versioned";
import { addIntent, CHECK_HOWS, CHECKS_MOST, getIntent, intentOf, IntentError, intentReady, INTENT_KINDS, INTENT_STAGES, listIntents, OPEN_STAGES, recordChecks, specifyIntent, TITLE_MOST, WHERES } from "./intents";
import { instructionsOf, promptOf, promptsOf } from "./skills";
import { adminByToken } from "./tokens";
import { admin, AUDIO_TYPES, listStories, MOST_AUDIO, MOST_DOCUMENT, MOST_FRAME, MOST_LINK_DEPTH, MOST_VIDEO, proposeStory, putAudioBase64, putDocument, putFrameBase64, putVideoBase64, slimLinks, storyOf, STORY_FORMAT, VIDEO_TYPES } from "./stories";
import { listSandboxes, proposeSandbox, sandboxOf, SandboxError } from "./sandboxes";
import { addArtifact, AUTHOR_KINDS, authorOf, DESCRIPTION_MOST, listAuthors, listArtifacts, ORIGINS, ARTIFACT_KINDS, ArtifactError, artifactOf, SUMMARY_WORDS, TITLE_MOST as ARTIFACT_TITLE_MOST, updateArtifact } from "./artifacts";

const PROTOCOL = "2025-06-18";
const HASH = /^[0-9a-f]{64}$/;
const GROUPS = ["plants", "things", "machines", "buildings", "actors", "biomes", "worlds"];

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: any, me: Me) => Promise<unknown>;
};

const RECIPE_RULE =
  "Send the version's readable source, as people write it (not bundled or minified: lines under 1000 characters), because " +
  "the admins read it before they decide. It is a CommonJS module that sets `module.exports.recipe = function (id, v, variant) { … return { meta, build } }`, " +
  "requires only 'three' and three's addons ('three/addons/…'), and names every other asset by its BLAKE3 hash. play wraps it into the " +
  "recipe file itself (the asset box's header, then the source, then the line naming this asset and its new version). The code runs only " +
  "in the asset box, the sandboxed frame in the page, never on play's server. Start from the head's source (get_asset gives its hash, " +
  "get_file its text). Every version has one: an imported version's is legacy's own code its recipe file was bundled from (the asset's " +
  "library, each module marked by the file it came from), made again and checked against that file byte for byte.";

const OPS =
  "Operations (edits), applied in order to the document: { op: 'set', path, value } (a field, or a list's item, replaced; a new field too), { op: 'insert', path, value } (into a list, before the index the path ends with; one past the end adds it last), { op: 'delete', path }, { op: 'move', path, to }, { op: 'text', path, index, delete?, insert? } (a range of a text). " +
  "A path is a list of field names and indexes, and an item of a list may be named by its id instead: ['line', 'stations', { id: 'weld' }, 'reserve'], ['stages', 'prototype']. A story and an asset read edits their own way (their formats below).";

export function mcp({ db, store }: { db: Db; store: BlobStore }) {
  const env = { db, store };
  const formats = kinds().map((k) => `${k.title}: ${k.format ?? "its JSON as doc_at gives it."}`).join(" ");
  const tools: Tool[] = [
    // ---- every versioned document, of any kind (./versioned.ts, play/SPEC.md "Version control"): one set of tools
    {
      name: "list_docs",
      description: `The documents of one kind, oldest first: each its id (a UUID: what names it everywhere), label and group (only shown), note, newest version's number, how many versions, and its kind's own fields. Kinds: ${kinds().map((k) => `${k.kind} (${k.title.toLowerCase()})`).join(", ")}.`,
      inputSchema: { type: "object", properties: { kind: { type: "string", enum: kinds().map((k) => k.kind) } }, required: ["kind"], additionalProperties: false },
      run: async ({ kind }, me) => listDocs(env, me, kind),
    },
    {
      name: "doc_at",
      description: `One document whole (its \`json\`), by its id: at Main's newest version, an accepted version, an edit of its history (doc_history's \`seq\`), a variant, or as an intent's work would make it; with its versions. Each kind's JSON: ${formats}`,
      inputSchema: {
        type: "object",
        properties: {
          doc: { type: "string", description: "the document's id, a UUID (list_docs; an asset's or story's id is its document's)" },
          version: { type: "integer", minimum: 1, description: "an accepted version's number; Main's newest if left out" },
          edit: { type: "integer", minimum: 1, description: "an edit of its history (doc_history's `seq`), instead of a version" },
          variant: { type: "integer", minimum: 1, description: "a variant's number: the document as it stands on it" },
          intent: { type: "string", description: "an intent's id: the document as its work would make it" },
        },
        required: ["doc"],
        additionalProperties: false,
      },
      run: async ({ doc, version, edit, variant, intent }, me) => docAt(env, me, doc, { version, edit, variant, intent }),
    },
    {
      name: "doc_history",
      description:
        "Every edit of a document, oldest first: Main's, with each accepted variant's where it was made (`merge` marks where one went in), each with its seq, who made it and how (site, mcp, import), its message, its time and the version it was named, if one; its versions; and its variants (each intent variant's status, seed, intent and how many edits). With `variant`, that variant's own edits.",
      inputSchema: {
        type: "object",
        properties: { doc: { type: "string", description: "the document's id, a UUID" }, variant: { type: "integer", minimum: 1, description: "a variant's number, for its own edits" } },
        required: ["doc"],
        additionalProperties: false,
      },
      run: async ({ doc, variant }, me) => docHistory(env, me, doc, variant == null ? {} : { variant: Number(variant) }),
    },
    {
      name: "doc_changes",
      description: "What one edit changed (`edit`: against the document just before it, on its line), or what a variant changes (`variant`: against its seed), field by field: each its path, added, removed or changed, from and to.",
      inputSchema: {
        type: "object",
        properties: { doc: { type: "string", description: "the document's id, a UUID" }, edit: { type: "integer", minimum: 1 }, variant: { type: "integer", minimum: 1 } },
        required: ["doc"],
        additionalProperties: false,
      },
      run: async ({ doc, edit, variant }, me) => docChanges(env, me, doc, variant != null ? { variant: Number(variant) } : { edit: Number(edit) }),
    },
    {
      name: "doc_edit",
      description:
        `One edit of an intent variant of a document, kept with its message: work on a document edit by edit (each fix, each tuning its own edit, so its history shows how it was made), then propose the variant with propose_doc_version and its \`variant\`. Without \`variant\` it starts a new one seeded at Main's newest version and gives back its number; pass it to the next edits. Nobody sees a variant as the document until a person accepts it. ` +
        `Give edits, the whole document (\`whole\`, doc_at's \`json\`), or a few of its top-level fields (\`fields\`). ${OPS} Each kind's JSON and own edits: ${formats}`,
      inputSchema: {
        type: "object",
        properties: {
          doc: { type: "string", description: "the document's id, a UUID" },
          message: { type: "string", description: "what this edit does, as its history will say it" },
          variant: { type: "integer", minimum: 1, description: "the variant to add the edit to (doc_edit gives it); a new one seeded at Main's newest version if left out" },
          edits: { type: "array", items: { type: "object" }, description: "operations (or a story's or an asset's own edits) applied in order to the variant" },
          whole: { type: "object", description: "the variant's whole new document (instead of edits)" },
          fields: { type: "object", description: "a few top-level fields set (an asset's source, label, note; a story's title, body; any document's label)" },
        },
        required: ["doc", "message"],
        additionalProperties: false,
      },
      run: async ({ doc, message, variant, edits, whole, fields }, me) => editDoc(env, me, { doc, message, edits, whole, fields, ...(variant != null ? { variant: Number(variant) } : {}) }),
    },
    {
      name: "propose_doc_version",
      description:
        `Propose a document's next version: an intent variant made edit by edit with doc_edit (its \`variant\`; edits, whole or fields given with it are its last edit), or a change at once on Main's newest version. It puts an intent at Proposal with it (via MCP), for Maia City's admins, who see what changes field by field on the intents' board (an asset built in the asset box, a story played) and accept or archive it: every change waits there for a person's Accept. ` +
        `\`extra\` carries what a kind's version holds beside its document: an asset version's record, card, variants, defaultVariant, sheet (its reference sheet's hash), datasheet and brief (hashes from add_document); a story's base. An asset's source: ${RECIPE_RULE}`,
      inputSchema: {
        type: "object",
        properties: {
          doc: { type: "string", description: "the document's id, a UUID" },
          note: { type: "string", description: "what changes and why, for the admins deciding" },
          variant: { type: "integer", minimum: 1, description: "an intent variant to propose (doc_edit gives it)" },
          edits: { type: "array", items: { type: "object" }, description: "operations applied in order (to the variant, if one is named)" },
          whole: { type: "object", description: "the whole new document (instead of edits)" },
          fields: { type: "object", description: "a few top-level fields set" },
          extra: { type: "object", description: "what a kind's version holds beside its document (an asset's record, card, variants, sheet …)" },
        },
        required: ["doc", "note"],
        additionalProperties: false,
      },
      run: async ({ doc, note, variant, edits, whole, fields, extra, intent }, me) => proposeDoc(env, me, { doc, note, edits, whole, fields, extra, intent, ...(variant != null ? { variant: Number(variant) } : {}) }),
    },
    {
      name: "list_assets",
      description: "Maia City's assets: id (UUID), group, slug, label, head version and how many versions. Filter by group or by words in the label or slug.",
      inputSchema: {
        type: "object",
        properties: { group: { type: "string", enum: GROUPS }, query: { type: "string" } },
        additionalProperties: false,
      },
      run: async ({ group, query }) => {
        const all = await listAssets(db, group);
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
        "With `intent`, its document as that intent's work would make it (doc_at's, at the intent's variant); at an edit of its history, doc_at's.",
      inputSchema: {
        type: "object",
        properties: { asset: { type: "string", description: "the asset's id (UUID)" }, intent: { type: "string", description: "an intent's id: the asset as its work would make it" } },
        required: ["asset"],
        additionalProperties: false,
      },
      run: async ({ asset, intent }, me) => (intent ? docAt(env, me, `${asset}`, { intent: `${intent}` }) : assetOf(db, `${asset}`)),
    },
    {
      name: "get_file",
      description: "A file's text by its BLAKE3 hash: a version's readable source or its recipe file (their hashes from get_asset).",
      inputSchema: { type: "object", properties: { hash: { type: "string", description: "64 hex characters" } }, required: ["hash"], additionalProperties: false },
      run: async ({ hash }) => {
        if (!HASH.test(`${hash}`)) throw new NotFound("That is not a file's hash.");
        const bytes = await store.get(`${hash}`);
        if (!bytes) throw new NotFound("There is no such file.");
        return { hash, text: new TextDecoder().decode(bytes) };
      },
    },
    {
      name: "propose_asset",
      description: `Propose a new asset, its first version. It puts an intent at Proposal with it (the intent you name, or a new one; via MCP), for Maia City's admins to decide. ${RECIPE_RULE}`,
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
          sheet: { type: ["string", "null"], description: "its reference sheet: the hash of an image play keeps (add it first with add_story_frame, with a label for the Library), a plant's plate of every stage and organ made for it; shown with the version in the asset library and, in the Library, beside the image, the plant it belongs to. Carried on from the head unless given; null takes it away" },
          datasheet: { type: ["string", "null"], description: "its data sheet: the hash of a document play keeps (add_document), the researched numbers with every source. Shown with the version and, in the Library, beside the document. Carried on from the head unless given; null takes it away" },
          brief: { type: ["string", "null"], description: "the brief its reference sheet was made from: the hash of a document play keeps (add_document). Carried on from the head unless given; null takes it away" },
        },
        required: ["group", "label", "note"],
        additionalProperties: false,
      },
      run: async ({ group, slug, label, source, note, variants, default_variant, params, sheet, datasheet, brief, intent }, me) => {
        const kinds = Array.isArray(variants) && variants.length ? variants : null;
        if (!source && !kinds) throw new VersionError("Give its source, or its variants.");
        // play runs no code: a recipe's declared params reach its record only from here (a build with values is refused without them)
        const texts = [source, ...(kinds ?? []).map((x: any) => x?.source)].filter((x) => typeof x === "string");
        if (params === undefined && texts.some((x) => /\bparams\s*:\s*(\[|[A-Za-z_$])/.test(x) && !/\bparams\s*:\s*\[\s*\]/.test(x)))
          throw new VersionError("Its recipe declares parameters (meta.params): give them as `params`, in the order its build takes them, or its builds with values are refused.");
        if (kinds && kinds.some((x: any) => !x?.source) && !source) throw new VersionError("Give the version's source, or each variant's own.");
        return propose(
          db,
          store,
          me,
          {
            new: { group, slug, label },
            ...(params !== undefined ? { card: { params } } : {}),
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
    // ---- sandboxes: what each draws (its pins) and how it lays them out (its configs), changed only by proposal (./sandboxes.ts)
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
        "Its configs whole, by name (Sandbox 1's `garden`: its layers of plantings, each { id, slot, stages, weight, … }, its spacing, drift and fields): anything in a config with a `slot` is drawn as that slot's pin. Change any of it with propose_sandbox_change.",
      inputSchema: { type: "object", properties: { sandbox: { type: "string", description: "its id, a UUID (list_sandboxes)" } }, required: ["sandbox"], additionalProperties: false },
      run: async ({ sandbox }, me) => sandboxOf(db, me, `${sandbox ?? ""}`),
    },
    {
      name: "propose_sandbox_change",
      description:
        "Propose a change of a sandbox's layout: which assets it draws, at which version, variant and values, and how it lays them out (any field of any of its configs: a planting's weight or stages, the spacing, a thing's position). It puts an intent at Proposal with it (via MCP), for Maia City's admins, who see each change before and after on the intents' board and can open the sandbox as it would be, then accept or archive it. Accepting applies the edits to the sandbox as it is then; one that no longer holds archives it. Edits, applied in order: " +
        "{ op: 'pin', slot, asset?, version?, variant?, params? } pins a slot (a new one needs `asset`, a UUID): `version` an accepted version's number, the asset's newest if left out; `variant` a variant's name, null for the version's default, kept where left out (and the new version has it); `params` its values ({ stage: 9 }), null for none, kept where left out. " +
        "{ op: 'pin_latest', asset, variant? } moves every slot that pins the asset to its newest version. { op: 'unpin', slot } (no config may still name it). " +
        "{ op: 'set', config, path, value } sets the value at a path of a config (['outside', 'trees', 3, 'weight']; an index one past the end adds an item; path [] sets the whole config, a new one too); { op: 'delete', config, path } removes it (path []: the whole config). A config names an asset only by { slot }, never by a ref.",
      inputSchema: {
        type: "object",
        properties: {
          sandbox: { type: "string", description: "its id, a UUID (list_sandboxes)" },
          note: { type: "string", description: "what changes and why, for the admins deciding" },
          edits: { type: "array", items: { type: "object" }, minItems: 1, description: "the edits, applied in order" },
        },
        required: ["sandbox", "note", "edits"],
        additionalProperties: false,
      },
      run: async ({ sandbox, note, edits, intent }, me) => proposeSandbox(db, me, { sandbox, note, edits, intent }, "mcp"),
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
      description: `One story's whole timeline, at its head or at an accepted version (its document at an edit of its history, or as an intent's work would make it, is doc_at's): ${STORY_FORMAT} It also lists the story's versions (number, id, note, author, who accepted it). Use its \`version\` as \`base\` when you propose a change. ` +
        "Its `links` are the versions it links, to any depth, each under the version's id: { id (the linked story's), title, number, version, duration, newest (that story's newest accepted number: where it is higher, a newer version is there to move to by set_clip) }; with `links: true` each also with its whole timeline (body). Its `linked_by` are the stories whose newest version links this one, each with the number of this one's version it plays.",
      inputSchema: {
        type: "object",
        properties: {
          story: { type: "string", description: "the story's id, a UUID (list_stories)" },
          version: { type: "integer", minimum: 1, description: "an accepted version's number; the head if left out" },
          links: { type: "boolean", description: "true: each linked story's whole timeline too (left out: only its title, number, version and duration)" },
          intent: { type: "string", description: "an intent's id: the story as its work would make it (doc_at's, at the intent's variant)" },
        },
        required: ["story"],
        additionalProperties: false,
      },
      run: async ({ story, version, links, intent }, me) => {
        if (intent) return docAt(env, me, `${story ?? ""}`, { intent: `${intent}` });
        const s = await storyOf(db, me, `${story ?? ""}`, version == null ? undefined : Number(version));
        return links === true ? s : { ...s, links: slimLinks(s.links) };
      },
    },
    {
      name: "propose_story",
      description: `Propose a new story, its first version, as its whole timeline. It gets a UUID of its own (the answer's story), which names it from then on; its title is only shown. It puts an intent at Proposal with it (via MCP), for Maia City's admins, who play it in the Stories player on the intents' board and accept or archive it. ${STORY_FORMAT} Add each storyboard image first with add_story_frame and use the hashes it gives as the shots' frames.`,
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
      description: `Add a storyboard image (a JPEG, PNG or WebP, at most ${MOST_FRAME / 1e6} MB) as base64. play keeps it among its files and gives back its BLAKE3 hash, to use as a shot's \`frame\` in propose_story or doc_edit. The same image always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { data: { type: "string", description: "the image's bytes as base64 (a data: URL's prefix is allowed)" }, media_type: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] }, label: { type: "string", description: "a short label for the Library (where it came from, what it shows); only shown, the file is named by its hash" } },
        required: ["data", "media_type"],
        additionalProperties: false,
      },
      run: async ({ data, media_type, label }, me) => (admin(me), putFrameBase64(db, store, data, media_type, label)),
    },
    {
      name: "add_story_video",
      description: `Add a video (an MP4 or WebM, at most ${MOST_VIDEO / 1e6} MB) as base64: a shot's moving picture, e.g. an image-to-video clip made from its frame. play keeps it among its files and gives back its BLAKE3 hash, to use as a shot's \`video\` (with \`video_in\`, where in it the shot starts) in propose_story, doc_edit. The Stories player plays it muted in the shot, the story's own sound under it, and shows the shot's frame until it can play. The same video always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { data: { type: "string", description: "the video's bytes as base64 (a data: URL's prefix is allowed)" }, media_type: { type: "string", enum: VIDEO_TYPES }, label: { type: "string", description: "a short label for the Library (where it came from, what it shows); only shown, the file is named by its hash" } },
        required: ["data", "media_type"],
        additionalProperties: false,
      },
      run: async ({ data, media_type, label }, me) => (admin(me), putVideoBase64(db, store, data, media_type, label)),
    },
    {
      name: "add_document",
      description: `Add a document (Markdown text, at most ${MOST_DOCUMENT / 1e6} MB): a plant's data sheet (its researched numbers, every row with its source) or the brief its reference sheet was made from. play keeps it among its files, shown in the Library with its label, and gives back its BLAKE3 hash, to name as a version's \`datasheet\` or \`brief\` in propose_doc_version (extra) or propose_asset (play/SPEC.md §4.10). The same text always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { text: { type: "string", description: "the document as Markdown text" }, label: { type: "string", description: "a short label for the Library (\"Data sheet · Plum 'Hauszwetschge'\"); only shown, the file is named by its hash" } },
        required: ["text"],
        additionalProperties: false,
      },
      run: async ({ text, label }, me) => (admin(me), putDocument(db, store, text, label)),
    },
    {
      name: "add_story_audio",
      description: `Add a recording (MP3, WAV, Ogg, FLAC, M4A or WebM audio, at most ${MOST_AUDIO / 1e6} MB) as base64: a voice take, a music cue, a sound effect, an ambience bed or a whole mix. play keeps it among its files and gives back its BLAKE3 hash, to use as a clip's \`audio\` in propose_story, doc_edit. The same recording always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { data: { type: "string", description: "the recording's bytes as base64 (a data: URL's prefix is allowed)" }, media_type: { type: "string", enum: AUDIO_TYPES }, label: { type: "string", description: "a short label for the Library (where it came from, what it shows); only shown, the file is named by its hash" } },
        required: ["data", "media_type"],
        additionalProperties: false,
      },
      run: async ({ data, media_type, label }, me) => (admin(me), putAudioBase64(db, store, data, media_type, label)),
    },
    // ---- intents (./intents.ts): everything on the board, Idea → Specify → Prototype → Proposal → Accepted or Archived
    {
      name: "list_intents",
      description:
        "Maia City's intents, the latest first: everything on the board, each something wanted made, fixed or improved, going Idea → Specify → Prototype → Proposal → Accepted (or Archived), code through Ship between Proposal and Accepted. Each has its id (a UUID), kind (idea, fix, improve), title, note, stage, who wrote it, its spec (goal, scope, checks) once specified, its checks' results while prototyped, and its work once proposed (`work`: what it changes, the version it would be, who proposed it and how, its status). One record: an intent at Proposal is the proposal, its work waiting for the decision. " +
        "Sent to work on an intent: read it with get_intent, whose `brief` says what to do at the stage it is at (the Intents skill's part for that stage: doc_at on the Intents skill).",
      inputSchema: {
        type: "object",
        properties: {
          stage: { type: "string", enum: [...INTENT_STAGES, "all"], description: "which intents: one stage, or all; those not yet done (idea, specify, prototype, proposal, ship) if left out" },
          work: { type: "string", enum: workKinds(), description: "only those holding work of this kind (an asset's or story's version, a sandbox's change, a factory's or config's version)" },
        },
        additionalProperties: false,
      },
      run: async ({ stage, work }, me) => listIntents(db, me, stage === "all" ? undefined : stage ? [`${stage}`] : OPEN_STAGES, work ? `${work}` : undefined),
    },
    {
      name: "get_intent",
      description: "One intent, whole: its kind, title, note, stage, who wrote, specified and approved it, its spec (goal, scope, checks: each its id, statement, how it is checked, must or nice), its checks' latest results with their evidence, its `brief` (what to do now, at the stage it is at: the Intents skill's part for that stage, filled for it; null where there is nothing to do), and its work (`work`) with its review (`review`: what it changes, as the board shows it before it is decided). An old proposal's id finds the intent it is now.",
      inputSchema: {
        type: "object",
        properties: { intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it)" } },
        required: ["intent"],
        additionalProperties: false,
      },
      run: async ({ intent }, me) => intentOf(db, me, `${intent ?? ""}`, (q, id, w) => reviewOf({ db: q, store }, id, w)),
    },
    {
      name: "add_intent",
      description:
        "Add an intent at the Idea stage, in this token's admin's name: something to make, fix or improve, as the admin asked you to note it or as you found it and are not doing now (a bug seen while working, an idea for an asset, a story or a sandbox), for the admins to triage. This is the only way an intent comes in: no one adds one by hand. " +
        "Say it in the title, in a line, and the rest in the note: where it is (name assets, stories and sandboxes by their ids), what is wrong or wanted, and why.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: TITLE_MOST, description: "what is to be made, fixed or improved, in a line" },
          note: { type: "string", description: "the rest: where, what and why (Markdown)" },
          kind: { type: "string", enum: [...INTENT_KINDS], description: "idea (something new), fix (something wrong) or improve (something there, made better); idea if left out" },
        },
        required: ["title"],
        additionalProperties: false,
      },
      run: async ({ title, note, kind }, me) => addIntent(db, me, { title, note, kind }),
    },
    {
      name: "specify_intent",
      description:
        "Specify an intent (Idea → Specify): what is wanted, made testable, the gate it is built and judged against. " +
        "goal: what is true when it is done, in a sentence. scope: what changes, named precisely (assets, stories and sandboxes by their UUIDs, files by their paths), and what stays as it is. " +
        `checks: 1 to ${CHECKS_MOST}, each ONE statement that passes or fails ("the fronds are 40–60 cm long", never "it looks realistic"), how it is checked, and must or nice: ` +
        "test (by: the command or test that passes), measure (by: the tool that measures it and the range it must fall in: the asset box's measured size or triangles, a count, a timing), look (by: the reference it is judged against by eye: a reference sheet by its hash, a photo, a named sandbox view). Prefer test and measure: they are deterministic; look is not. " +
        "Every test and measure check carries its run: the exact command that decides it in avenBOX (the cloud environment the agents prototype in, and main's runner after the merge: Postgres 17 up, TEST_DATABASE_URL set, every part's dependencies installed), from the repository's root, as written: a test passes when its run exits 0; a measure's run prints the value and exits 0 only when it is in its range. Nothing in a run is left to fill in: play refuses a placeholder (`…`, `...`, `<its id>`, TEST_DATABASE_URL given a value) outside quotes. In Prototype `bun play/avenbox/intent.ts <the intent's id> --record` runs them all. " +
        "Every check must be decidable by someone who reads only the intent and the result. At least one is a must; every must passes before it is proposed. Specified again, the spec is replaced. Then an admin approves it (Specify → Prototype) before anything is built.",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it)" },
          goal: { type: "string", description: "what is true when it is done, in a sentence" },
          scope: { type: "string", description: "what changes, named by UUIDs, hashes or paths, and what stays as it is (Markdown)" },
          checks: {
            type: "array",
            minItems: 1,
            maxItems: CHECKS_MOST,
            items: {
              type: "object",
              properties: {
                check: { type: "string", description: "one statement that passes or fails" },
                how: { type: "string", enum: [...CHECK_HOWS] },
                by: { type: "string", description: "test: the command that passes; measure: the tool and the range; look: the reference it is judged against" },
                run: {
                  type: "string",
                  description:
                    "the command that decides it in avenBOX, run from the repository's root as written, no placeholder in it (TEST_DATABASE_URL is set already): required for test (passes when it exits 0) and measure (prints the value, exits 0 only in its range); for a look, optionally the command that makes what is looked at (screenshots)",
                },
                must: { type: "boolean", description: "true (the default): it must pass before the intent is proposed; false: nice to have" },
              },
              required: ["check", "how", "by"],
              additionalProperties: false,
            },
          },
          title: { type: "string", maxLength: TITLE_MOST, description: "a sharper title, if it needs one" },
          kind: { type: "string", enum: [...INTENT_KINDS] },
          note: { type: "string", description: "a new note, if it needs one" },
        },
        required: ["intent", "goal", "scope", "checks"],
        additionalProperties: false,
      },
      run: async ({ intent, goal, scope, checks, title, kind, note }, me) => specifyIntent(db, me, `${intent ?? ""}`, { goal, scope, checks, title, kind, note }),
    },
    {
      name: "check_intent",
      description:
        "Record the results of an intent's checks while it is prototyped (its spec approved): for each check its id (c1, c2 …), whether it passes, and its evidence: for a test the command and what it printed, for a measure the value measured and by what, for a look what was compared with what; where it ran (avenBOX, the default, or main) and the commit. Run the check before you record it; record a failure as a failure. The latest result of each check stands. `bun play/avenbox/intent.ts <the intent's id> --record` runs every check with a run in avenBOX and records them itself; record by hand only a look. Once every must check passes, the intent moves to Proposal by itself, where an admin decides it (checked again there while no work of it waits, a must that fails takes it back to Prototype); work of play's you propose naming the intent (every propose tool's `intent`). Code goes by pull request into main with `Intent: <the intent's id>` in its commits: name it with `pr` (intent.ts --pr) and record the checks on its head, as Accept merges only the head every must check with a run last passed on; never merge it yourself: an admin's Accept merges it and ships it (the intent in Ship until it is in production). main records the checks again after the merge (where main), a confirmation in any stage.",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string", description: "the intent's id (a UUID)" },
          results: {
            type: "array",
            description: "each check's result; may be left out when only pr is given",
            items: {
              type: "object",
              properties: {
                check: { type: "string", description: "the check's id: c1, c2 …" },
                pass: { type: "boolean" },
                evidence: { type: "string" },
                where: { type: "string", enum: [...WHERES], description: "where it ran: avenBOX (the default) or main (after the merge, by .github/workflows/intents.yml)" },
                commit: { type: "string", description: "the 40-character git hash it ran on" },
              },
              required: ["check", "pass", "evidence"],
              additionalProperties: false,
            },
          },
          pr: { type: "integer", minimum: 1, description: "the number of the intent's pull request into main (its code), which an admin's Accept merges; named while it is prototyped or at Proposal, a newer one replacing it" },
        },
        required: ["intent"],
        additionalProperties: false,
      },
      run: async ({ intent, results, pr }, me) => recordChecks(db, me, `${intent ?? ""}`, results, pr),
    },
    {
      name: "archive_intent",
      description:
        "Archive an intent of your own at Proposal, still waiting for a decision: one whose work you no longer stand by, or one newer work of yours replaces elsewhere (to replace an intent's own work, propose again naming it: the new work replaces the old). Only one this token's admin put at Proposal over MCP (its work proposed here, or, with no work, added here), never anyone else's or one proposed on the page. It ends archived, its work's branch kept as a side line in the history; accepting stays a person's, on the intents' board.",
      inputSchema: {
        type: "object",
        properties: { intent: { type: "string", description: "the intent's id (a UUID: list_intents gives it, with who proposed its work and how)" } },
        required: ["intent"],
        additionalProperties: false,
      },
      run: async ({ intent }, me) => archiveOwn(db, me, `${intent ?? ""}`),
    },
    // ---- artifacts (./artifacts.ts, play/SPEC.md §4.13): Maia City's library of links, kept by avenMAIA
    {
      name: "list_artifacts",
      description:
        "Maia City's artifacts, newest first: every link kept, each its id (a UUID), link, title, description, kind, tags, published date, authors (ids and names), origin and who brought it (\"Added by <operator>\" or \"Sourced by avenMAIA\"), without its summary (get_artifact). " +
        "q finds words in a title, description, summary, link or an author's name; author (an author's id), tag, kind and origin narrow it. Look here before you add a link: one link is one artifact.",
      inputSchema: {
        type: "object",
        properties: {
          q: { type: "string", description: "words to find in a title, description, summary, link or an author's name" },
          author: { type: "string", description: "only the artifacts of this author (their id, a UUID: list_authors gives it)" },
          tag: { type: "string" },
          kind: { type: "string", enum: [...ARTIFACT_KINDS] },
          origin: { type: "string", enum: [...ORIGINS], description: "human: pasted by an operator; agent: found by avenMAIA in its own research" },
          offset: { type: "integer", minimum: 0 },
          limit: { type: "integer", minimum: 1, maximum: 200 },
        },
        additionalProperties: false,
      },
      run: async (args, me) => listArtifacts(db, me, args),
    },
    {
      name: "get_artifact",
      description: "One artifact, whole: its link, title, description and summary, kind, tags, published date, authors in order, origin and who brought it, when it was kept and last corrected, and the hash of its page's text if it was kept (get_file reads it).",
      inputSchema: {
        type: "object",
        properties: { artifact: { type: "string", description: "the artifact's id (a UUID: list_artifacts gives it)" } },
        required: ["artifact"],
        additionalProperties: false,
      },
      run: async ({ artifact }, me) => artifactOf(db, me, artifact),
    },
    {
      name: "add_artifact",
      description:
        "Keep an artifact in Maia City's Artifacts: a link from the net (a web page, an article, a paper, a video, a social post, a book, a podcast, code) with its three texts and its authors. Every artifact is kept as avenMAIA's (who you are: initialize's instructions), for the admin whose token connected you (its operator). " +
        "Every link your operator pastes to you, add with origin 'human' (shown \"Added by\" them); every artifact you find and use in your own research (a plant's numbers, a claim in a story, a technique), add with origin 'agent' (shown \"Sourced by avenMAIA\"). " +
        `Read the artifact itself first, then write: title, very compact (what it is about in plain words: one line, at most ${ARTIFACT_TITLE_MOST} characters, without the site's or channel's name, which is an author, no clickbait); ` +
        `description, the mini summary (1–2 sentences, one line, at most ${DESCRIPTION_MOST} characters, no Markdown: what it is and its main point); ` +
        `summary, a small report on the overall topic (Markdown, ${SUMMARY_WORDS.least}–${SUMMARY_WORDS.most} words, in the sections ## What it is (who made it, what kind of thing, when, from which angle), ## Key points (its claims, findings and numbers as bullets, as the artifact puts them), ## The topic (the wider subject: what it is, where this artifact stands in it, what else is known or disputed), and if you like ## For Maia City last (where it bears on our work); what the artifact says in the first two, what you know beyond it only in ## The topic). ` +
        "Authors: call list_authors first and name an author already kept by their id; add a new one { name, kind: person | organization, url? } only when none is them (two of one name stay two: never guess by a name). Where no person is named, its publisher (a site, a channel, a lab) is its author, as an organization. " +
        "One link is one artifact: links are compared without their #fragment, utm_*, fbclid and gclid and a trailing slash, and a YouTube video is one link however it is written; a link already kept answers with that artifact and kept: true (correct it with update_artifact). " +
        "Give text, the page's readable text as you fetched it, to keep a copy: links rot and pages change.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "the link, http(s)" },
          title: { type: "string", maxLength: ARTIFACT_TITLE_MOST, description: `very compact: one line, at most ${ARTIFACT_TITLE_MOST} characters` },
          description: { type: "string", maxLength: DESCRIPTION_MOST, description: `the mini summary: 1–2 sentences, one line, at most ${DESCRIPTION_MOST} characters, no Markdown` },
          summary: { type: "string", description: `a small report on the overall topic: Markdown, ${SUMMARY_WORDS.least}–${SUMMARY_WORDS.most} words, ## What it is, ## Key points (bullets), ## The topic, and if you like ## For Maia City` },
          authors: {
            type: "array",
            minItems: 1,
            description: "its authors, in order: an author already kept by their id ({ id }, list_authors), or a new one ({ name, kind, url?, note? })",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "an author already kept (a UUID: list_authors gives it)" },
                name: { type: "string", description: "a new author's name" },
                kind: { type: "string", enum: [...AUTHOR_KINDS] },
                url: { type: "string", description: "their page or profile, http(s)" },
                note: { type: "string", description: "who they are, in a line" },
              },
              additionalProperties: false,
            },
          },
          kind: { type: "string", enum: [...ARTIFACT_KINDS] },
          tags: { type: "array", items: { type: "string" }, description: "a few words it is about, lower case" },
          published: { type: "string", description: "when it was published, YYYY-MM-DD, if known" },
          origin: { type: "string", enum: [...ORIGINS], description: "human: your operator pasted it; agent: you found it in your own research" },
          text: { type: "string", description: "the page's readable text as you fetched it, kept among play's files by its hash" },
        },
        required: ["url", "title", "description", "summary", "authors", "kind", "origin"],
        additionalProperties: false,
      },
      run: async (args, me) => addArtifact(db, store, me, args),
    },
    {
      name: "update_artifact",
      description:
        "Correct a kept artifact: any of its link, title, description, summary, kind, tags, published date, authors (the whole list, in order, as in add_artifact) and text, each held to the same form as in add_artifact. Who corrected it and when are kept; its origin and who brought it never change.",
      inputSchema: {
        type: "object",
        properties: {
          artifact: { type: "string", description: "the artifact's id (a UUID)" },
          url: { type: "string" },
          title: { type: "string", maxLength: ARTIFACT_TITLE_MOST },
          description: { type: "string", maxLength: DESCRIPTION_MOST },
          summary: { type: "string" },
          authors: { type: "array", minItems: 1, items: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, kind: { type: "string", enum: [...AUTHOR_KINDS] }, url: { type: "string" }, note: { type: "string" } }, additionalProperties: false } },
          kind: { type: "string", enum: [...ARTIFACT_KINDS] },
          tags: { type: "array", items: { type: "string" } },
          published: { type: "string" },
          text: { type: "string" },
        },
        required: ["artifact"],
        additionalProperties: false,
      },
      run: async ({ artifact, ...fields }, me) => updateArtifact(db, store, me, artifact, fields),
    },
    {
      name: "list_authors",
      description: "The authors of Maia City's artifacts, by name: each their id (a UUID), name, kind (person or organization), page and how many artifacts name them. q finds words in a name. Look here before you name an author in add_artifact, and reuse one by their id.",
      inputSchema: {
        type: "object",
        properties: { q: { type: "string", description: "words in the author's name" } },
        additionalProperties: false,
      },
      run: async ({ q }, me) => listAuthors(db, me, { q }),
    },
    {
      name: "get_author",
      description: "One author, with every artifact that names them, newest first.",
      inputSchema: {
        type: "object",
        properties: { author: { type: "string", description: "the author's id (a UUID: list_authors gives it)" } },
        required: ["author"],
        additionalProperties: false,
      },
      run: async ({ author }, me) => authorOf(db, me, author),
    },
  ];

  // to propose is to put an intent at Proposal (play/SPEC.md §4.12): work proposed for an intent names it, held to its gate
  // first (its spec approved and every must check passed, ./intents.ts intentReady), and replaces any work it held; work
  // proposed without is a new intent of its own. Every propose tool gives back the intent (`intent`, at stage proposal)
  for (const t of tools) {
    if (!t.name.startsWith("propose_")) continue;
    (t.inputSchema.properties as Record<string, unknown>).intent = {
      type: "string",
      description: "the intent this is the work of, by its id (a UUID: list_intents gives it): its spec approved and every must check passed (check_intent), or nothing is proposed; it moves to Proposal with this work, replacing any it held. Without it, this is a new intent at Proposal of its own, with no spec",
    };
    const run = t.run;
    t.run = async ({ intent, ...args }, me) => {
      if (intent === undefined || intent === null || intent === "") return run(args, me);
      const ready = await intentReady(db, me, intent);
      return run({ ...args, intent: ready.id }, me);
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
          return reply(msg.id, await promptOf(db, msg.params?.name, msg.params?.arguments, (q, id) => getIntent(q, id)));
        } catch (e) {
          if (e instanceof VersionError || e instanceof IntentError) return fail(msg.id, -32602, (e as Error).message);
          throw e;
        }
      case "tools/list":
        return reply(msg.id, { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
      case "tools/call": {
        const tool = tools.find((t) => t.name === msg.params?.name);
        if (!tool) return fail(msg.id, -32602, `There is no tool ${msg.params?.name}.`);
        try {
          const out = await tool.run(msg.params?.arguments ?? {}, me);
          return reply(msg.id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: Array.isArray(out) ? { items: out } : out });
        } catch (e) {
          // what went wrong, as the tool's own answer the agent reads (a refused recipe, a moved head, no such asset)
          if (e instanceof VersionError || e instanceof WorkError || e instanceof IntentError || e instanceof NotFound || e instanceof SandboxError || e instanceof ArtifactError || (e as Error)?.name === "Denied" || (e as any)?.status)
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
