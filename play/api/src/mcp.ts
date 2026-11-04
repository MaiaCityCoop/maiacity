// play's MCP server (/api/mcp, Streamable HTTP, stateless): an agent works on Maia City's assets and stories for an
// admin, by that admin's access token (./tokens.ts, `Authorization: Bearer play_…`). It reads the assets, their versions
// and their recipe files, and proposes new versions and new assets, drafted step by step if it likes (asset_edit, each
// step kept in the asset's Loro document, ./assetdocs.ts); it reads the stories (./stories.ts) and proposes new stories
// and new versions of them, with the storyboard images they show. All are filed as the admin's proposals with `via`
// 'mcp'. Accepting stays a person's, on the Proposals page (Samuel 2026-11-02): no tool here accepts. An agent may
// archive only its own open proposals made here (archive_proposal, Samuel 2026-11-04), one it has replaced or no longer
// stands by.
import type { BlobStore } from "./blobs";
import type { Db } from "./pg";
import type { Me } from "./access";
import { assetOf, listAssets, NotFound } from "./assets";
import { archiveOwn, listProposals, propose, ProposalError } from "./proposals";
import { adminByToken } from "./tokens";
import { admin, AUDIO_TYPES, editStory, listStories, MOST_AUDIO, MOST_FRAME, proposeStory, putAudioBase64, putFrameBase64, storyAtStep, storyHistory, storyOf, StoryError } from "./stories";
import { AssetDocError, assetAtStep, assetHistory, editAsset } from "./assetdocs";
import { listSandboxes, proposeSandbox, sandboxOf, SandboxError } from "./sandboxes";

const PROTOCOL = "2025-06-18";
const HASH = /^[0-9a-f]{64}$/;
const GROUPS = ["plants", "things", "machines", "buildings", "actors", "biomes"];

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

const STORY_FORMAT =
  "A story is a film as one timeline (format story/1): { schema: 'story/1', format: '9:16' | '16:9' | '1:1' | '4:5', fps: 24 | 25 | 30 | 48 | 50 | 60, duration, tracks }. " +
  "Each track is { id, kind, clips } and each clip { id, at, duration } in seconds (at may be left out to follow the clip before it), plus its kind's fields: " +
  "kind 'shots' { frame: an image's hash from add_story_frame, transition: how it goes into the next shot }; " +
  "kind 'voice' { who, line } (the narration, shown as the subtitle); " +
  "kind 'notes' { section, camera, retention, mood } (mood as arrows: ↑ ↑↑ ↑↑↑ ↓ ↓↓ ↕). " +
  "Any clip of any track may sound: { audio: a recording's hash from add_story_audio, audio_in: where in the recording it starts (s), gain (dB), fade_in, fade_out (s) }, played from the clip's at for its duration; " +
  "a voice clip's audio is its take, and tracks of kind music, sfx or ambience hold the score, the spot sounds and the beds, their clips overlapping as they like; a track may carry gain (dB) and mute. " +
  "A clip may carry more fields, and a track may be of another kind (callout, scene): they are kept as given. " +
  "duration is worked out from the clips. Clip ids are unique within their track; track ids within the story.";

export function mcp({ db, store }: { db: Db; store: BlobStore }) {
  const tools: Tool[] = [
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
        "With `step` (asset_history's `seq`), the asset as it was at that step of its history instead: its whole source as text, its label, note, engine, card and variants.",
      inputSchema: {
        type: "object",
        properties: { asset: { type: "string", description: "the asset's id (UUID)" }, step: { type: "integer", minimum: 1, description: "a step of its history (asset_history's `seq`)" } },
        required: ["asset"],
        additionalProperties: false,
      },
      run: async ({ asset, step }, me) => (step != null ? assetAtStep(db, store, me, `${asset}`, Number(step)) : assetOf(db, `${asset}`)),
    },
    {
      name: "asset_history",
      description:
        "Every step of an asset's history, oldest first: each with its seq, who made it (and whether over MCP), its message, its time, and the version it was named, if one. An asset is kept step by step (a Loro document, play/SPEC.md §4.4): its accepted versions, the work kept between them, every asset_edit and every proposal are steps. Also its versions and its drafts (each draft's status, steps and proposal). With `draft`, one draft's own steps. Read any step's source with get_asset's `step`.",
      inputSchema: {
        type: "object",
        properties: { asset: { type: "string", description: "the asset's id (UUID)" }, draft: { type: "integer", minimum: 1, description: "a draft's number, for its own steps" } },
        required: ["asset"],
        additionalProperties: false,
      },
      run: async ({ asset, draft }, me) => assetHistory(db, store, me, `${asset}`, draft == null ? {} : { branch: Number(draft) }),
    },
    {
      name: "asset_edit",
      description:
        "One step of a draft change to an asset, kept with its message: work on an asset step by step (each fix, each tuning its own step, so the history shows how it was made), then propose the draft as a version with propose_version and its `branch`. Without `branch` it starts a new draft from the asset's head and gives back its number; pass that number to the next steps. Nobody sees a draft as the asset until it is proposed and accepted; the source is checked as readable code when it is proposed. " +
        "Edits, applied in order: { op: 'replace', find, replace, field?: 'source' | 'note', variant? } replaces the one place `find` stands in the source (give enough of it to be unique); { op: 'text', path: ['source'], index, delete?, insert? } changes a range of a text by its position; { op: 'set', path: ['card', 'card', 'label'], value } sets a field of the card (or the label, note, engine); { op: 'delete', path }. Or give a whole new `source`, `label` or `note` instead of edits.",
      inputSchema: {
        type: "object",
        properties: {
          asset: { type: "string", description: "the asset's id (UUID)" },
          message: { type: "string", description: "what this step does, as its history will say it" },
          branch: { type: "integer", minimum: 1, description: "the draft to add the step to (asset_edit gives it); a new draft from the head if left out" },
          edits: { type: "array", items: { type: "object" }, description: "edits applied in order to the draft" },
          source: { type: "string", description: "the draft's whole new readable source (instead of edits)" },
          label: { type: "string", description: "a new label" },
          note: { type: "string", description: "the note the version will carry" },
        },
        required: ["asset", "message"],
        additionalProperties: false,
      },
      run: async ({ asset, message, branch, edits, source, label, note }, me) => editAsset(db, store, me, { asset: `${asset}`, message, edits, source, label, note, ...(branch != null ? { branch: Number(branch) } : {}) }),
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
      name: "propose_version",
      description:
        `Propose a new version of an asset. It goes to Maia City's admins as a proposal (via MCP), to accept or archive on the Proposals page, where they see it built in the asset box and the steps it was made in. Give its whole \`source\`, or propose a draft made step by step with asset_edit (its \`branch\`): its steps go with it. ${RECIPE_RULE}`,
      inputSchema: {
        type: "object",
        properties: {
          asset: { type: "string", description: "the asset's id (UUID)" },
          source: { type: "string", description: "the new version's readable source (see above); with `branch`, the draft's source if left out" },
          note: { type: "string", description: "what changed and why, for the admins deciding" },
          base: { type: "string", description: "the head version's id it was made from (from get_asset); refused if the asset moved on since" },
          branch: { type: "integer", minimum: 1, description: "a draft made with asset_edit, proposed as it stands" },
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
              "the parameters the recipe now declares (its meta.params: { id, label, type: 'number' | 'integer' | 'string', value, min?, max?, step?, names?, maxLength? }), in the order its build takes them, when they change; otherwise the head's are kept",
            items: { type: "object" },
          },
        },
        required: ["asset", "note"],
        additionalProperties: false,
      },
      run: async ({ asset, source, note, base, branch, variants, default_variant, params }, me) => {
        if (branch == null && !source && !variants?.length) throw new ProposalError("Give the new version's source, or the draft (branch) it stands in.");
        const kinds = Array.isArray(variants) && variants.length ? variants : null;
        if (kinds && kinds.some((x: any) => !x?.source) && !source) throw new ProposalError("Give the version's source, or each variant's own.");
        const names = kinds?.map((x: any) => `${x?.name ?? ""}`) ?? [];
        if (new Set(names).size !== names.length) throw new ProposalError("Each variant has a name of its own.");
        return propose(
          db,
          store,
          me,
          {
            asset,
            ...(kinds
              ? { variants: Object.fromEntries(kinds.map((x: any) => [`${x.name}`, { source: `${x.source ?? source}`, ...(x.label !== undefined ? { label: `${x.label}` } : {}) }])), ...(default_variant ? { defaultVariant: `${default_variant}` } : {}) }
              : source
                ? { source: `${source}` }
                : {}),
            ...(params !== undefined ? { card: { params } } : {}),
            note,
            ...(base ? { base } : {}),
            ...(branch != null ? { branch: Number(branch) } : {}),
          },
          "mcp",
        );
      },
    },
    {
      name: "propose_asset",
      description: `Propose a new asset, its first version. It goes to Maia City's admins as a proposal (via MCP). ${RECIPE_RULE}`,
      inputSchema: {
        type: "object",
        properties: {
          group: { type: "string", enum: GROUPS },
          slug: { type: "string", description: "lowercase words joined by '-', unique in its group" },
          label: { type: "string", description: "its name as shown" },
          source: { type: "string", description: "version 1's readable source (see above)" },
          note: { type: "string", description: "what it is and why, for the admins deciding" },
        },
        required: ["group", "slug", "label", "source", "note"],
        additionalProperties: false,
      },
      run: async ({ group, slug, label, source, note }, me) => propose(db, store, me, { new: { group, slug, label }, source: `${source ?? ""}`, note }, "mcp"),
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
      inputSchema: { type: "object", properties: { sandbox: { type: "string", description: "its id (list_sandboxes)" } }, required: ["sandbox"], additionalProperties: false },
      run: async ({ sandbox }, me) => sandboxOf(db, me, `${sandbox ?? ""}`),
    },
    {
      name: "propose_sandbox_change",
      description:
        "Propose a change of a sandbox's layout: which assets it draws, at which version, variant and values, and how it lays them out (any field of any of its configs: a planting's weight or stages, the spacing, a thing's position). It goes to Maia City's admins as a proposal (via MCP), who see each change before and after on the Proposals page and can open the sandbox as it would be, then accept or archive it. Accepting applies the edits to the sandbox as it is then; one that no longer holds archives it. Edits, applied in order: " +
        "{ op: 'pin', slot, asset?, version?, variant?, params? } pins a slot (a new one needs `asset`, a UUID): `version` an accepted version's number, the asset's newest if left out; `variant` a variant's name, null for the version's default, kept where left out (and the new version has it); `params` its values ({ stage: 9 }), null for none, kept where left out. " +
        "{ op: 'pin_latest', asset, variant? } moves every slot that pins the asset to its newest version. { op: 'unpin', slot } (no config may still name it). " +
        "{ op: 'set', config, path, value } sets the value at a path of a config (['outside', 'trees', 3, 'weight']; an index one past the end adds an item; path [] sets the whole config, a new one too); { op: 'delete', config, path } removes it (path []: the whole config). A config names an asset only by { slot }, never by a ref.",
      inputSchema: {
        type: "object",
        properties: {
          sandbox: { type: "string", description: "its id (list_sandboxes)" },
          note: { type: "string", description: "what changes and why, for the admins deciding" },
          edits: { type: "array", items: { type: "object" }, minItems: 1, description: "the edits, applied in order" },
        },
        required: ["sandbox", "note", "edits"],
        additionalProperties: false,
      },
      run: async ({ sandbox, note, edits }, me) => proposeSandbox(db, me, { sandbox, note, edits }, "mcp"),
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
      description: `One story's whole timeline, at its head, at an accepted version, or at any step of its history (story_history lists them): ${STORY_FORMAT} At its head or a version it also lists the story's versions (number, id, note, author, who accepted it). Use its \`version\` as \`base\` when you propose a change.`,
      inputSchema: {
        type: "object",
        properties: {
          story: { type: "string", description: "the story's id (a slug, from list_stories)" },
          version: { type: "integer", minimum: 1, description: "an accepted version's number; the head if left out" },
          step: { type: "integer", minimum: 1, description: "a step of its history (story_history's `seq`), instead of a version" },
        },
        required: ["story"],
        additionalProperties: false,
      },
      run: async ({ story, version, step }, me) => (step != null ? storyAtStep(db, me, `${story ?? ""}`, Number(step)) : storyOf(db, me, `${story ?? ""}`, version == null ? undefined : Number(version))),
    },
    {
      name: "story_history",
      description:
        "Every step of a story's history, oldest first: each with its seq, who made it (and whether over MCP), its message, its time, and the version it was named, if one. A story is kept step by step (a Loro document, play/SPEC.md §4.4): every story_edit, every proposal and every accepted version is a step. Also its versions and its drafts (each draft's status, steps and proposal). With `draft`, one draft's own steps. Read any step's timeline with get_story's `step`.",
      inputSchema: {
        type: "object",
        properties: { story: { type: "string", description: "the story's id" }, draft: { type: "integer", minimum: 1, description: "a draft's number, for its own steps" } },
        required: ["story"],
        additionalProperties: false,
      },
      run: async ({ story, draft }, me) => storyHistory(db, me, `${story ?? ""}`, draft == null ? {} : { branch: Number(draft) }),
    },
    {
      name: "story_edit",
      description:
        "One step of a draft change to a story, kept with its message: work on a story step by step (retime a clip, re-word a line, add, move or remove clips and tracks), then propose the draft as a version with propose_story_version and its `branch`. Without `branch` it starts a new draft from the story's head and gives back its number; pass that number to the next steps. Every step is checked whole, as a proposal is, and nobody sees a draft as the story until it is proposed and accepted. " +
        "Edits are propose_story_version's, plus { op: 'edit_text', track, clip, field, index, delete?, insert? } to change a range of one of a clip's texts (its line, transition, camera …). Or give a whole timeline (body), or only a new title.",
      inputSchema: {
        type: "object",
        properties: {
          story: { type: "string", description: "the story's id" },
          message: { type: "string", description: "what this step does, as its history will say it" },
          branch: { type: "integer", minimum: 1, description: "the draft to add the step to (story_edit gives it); a new draft from the head if left out" },
          edits: { type: "array", items: { type: "object" }, description: "edits applied in order to the draft's timeline" },
          body: { type: "object", description: "the draft's whole new timeline (instead of edits)" },
          title: { type: "string", description: "a new title" },
        },
        required: ["story", "message"],
        additionalProperties: false,
      },
      run: async ({ story, message, branch, edits, body, title }, me) => editStory(db, me, { story, message, title, body, edits, ...(branch != null ? { branch: Number(branch) } : {}) }),
    },
    {
      name: "propose_story",
      description: `Propose a new story, its first version, as its whole timeline. It goes to Maia City's admins as a proposal (via MCP), who play it in the Stories player on the Proposals page and accept or archive it. ${STORY_FORMAT} Add each storyboard image first with add_story_frame and use the hashes it gives as the shots' frames.`,
      inputSchema: {
        type: "object",
        properties: {
          story: { type: "string", description: "its id: lower-case words joined by '-', up to 64 characters, unique" },
          title: { type: "string", description: "its title as shown" },
          body: { type: "object", description: "the timeline: { format, fps, tracks: [{ id, kind, clips: [{ id, at, duration, … }] }] }" },
          note: { type: "string", description: "what it is and why, for the admins deciding" },
        },
        required: ["story", "title", "body", "note"],
        additionalProperties: false,
      },
      run: async ({ story, title, body, note }, me) => proposeStory(db, me, { story, title, body, note }, true),
    },
    {
      name: "propose_story_version",
      description:
        `Propose a new version of a story: any change to any field of any clip on any track, adding or removing clips and tracks, retiming, the title, the format or the frame rate. Give either the whole new timeline (body) or edits applied in order to the head's; what is stored is the whole timeline either way, checked as a whole. Edits: ` +
        `{ op: 'set_clip', track, clip, fields: {…} } sets fields of a clip (at, duration, line, who, frame, transition, section, camera, retention, mood, or any other; a field set to null is removed); ` +
        `{ op: 'add_clip', track, clip: { id, at, duration, … } }; { op: 'remove_clip', track, clip }; ` +
        `{ op: 'add_track', track: { id, kind, clips }, index? }; { op: 'remove_track', track }; { op: 'set_track', track, fields: { id?, kind? } }; ` +
        `{ op: 'shift', from, by, tracks? } moves every clip starting at or after \`from\` seconds by \`by\` seconds (negative to pull in), on all tracks or the ones named, to make room or close a gap; ` +
        `{ op: 'set', fields: { format?, fps? } }; { op: 'edit_text', track, clip, field, index, delete?, insert? } changes a range of one of a clip's texts. On shots, voice and notes tracks clips must not overlap, so retime with shift. ${STORY_FORMAT} ` +
        `Or propose a draft made step by step with story_edit (its \`branch\`): its steps go with it, and the admins see them. It goes to the admins as a proposal (via MCP), shown against the head clip by clip. If the story gets a newer version before it is accepted, it still goes in where the two changes touch different fields, and is archived where they touch the same (to be proposed again on the new head).`,
      inputSchema: {
        type: "object",
        properties: {
          story: { type: "string", description: "the story's id" },
          note: { type: "string", description: "what changed and why, for the admins deciding" },
          base: { type: "string", description: "the head version's id it was made from (get_story's `version`); refused if the story moved on since" },
          title: { type: "string", description: "a new title, if it changes" },
          body: { type: "object", description: "the whole new timeline (instead of edits)" },
          edits: { type: "array", items: { type: "object" }, description: "edits applied in order to the head's timeline (instead of body)" },
          branch: { type: "integer", minimum: 1, description: "a draft made with story_edit, proposed as it stands (edits, body or title given with it are its last step)" },
        },
        required: ["story", "note"],
        additionalProperties: false,
      },
      run: async ({ story, note, base, title, body, edits, branch }, me) => proposeStory(db, me, { story, note, title, body, edits, ...(base ? { base } : {}), ...(branch != null ? { branch: Number(branch) } : {}) }, false),
    },
    {
      name: "add_story_frame",
      description: `Add a storyboard image (a JPEG, PNG or WebP, at most ${MOST_FRAME / 1e6} MB) as base64. play keeps it among its files and gives back its BLAKE3 hash, to use as a shot's \`frame\` in propose_story or propose_story_version. The same image always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { data: { type: "string", description: "the image's bytes as base64 (a data: URL's prefix is allowed)" }, media_type: { type: "string", enum: ["image/jpeg", "image/png", "image/webp"] } },
        required: ["data", "media_type"],
        additionalProperties: false,
      },
      run: async ({ data, media_type }, me) => (admin(me), putFrameBase64(db, store, data, media_type)),
    },
    {
      name: "add_story_audio",
      description: `Add a recording (MP3, WAV, Ogg, FLAC, M4A or WebM audio, at most ${MOST_AUDIO / 1e6} MB) as base64: a voice take, a music cue, a sound effect, an ambience bed or a whole mix. play keeps it among its files and gives back its BLAKE3 hash, to use as a clip's \`audio\` in propose_story, propose_story_version or story_edit. The same recording always gives the same hash.`,
      inputSchema: {
        type: "object",
        properties: { data: { type: "string", description: "the recording's bytes as base64 (a data: URL's prefix is allowed)" }, media_type: { type: "string", enum: AUDIO_TYPES } },
        required: ["data", "media_type"],
        additionalProperties: false,
      },
      run: async ({ data, media_type }, me) => (admin(me), putAudioBase64(db, store, data, media_type)),
    },
    {
      name: "list_proposals",
      description: "The proposals, newest first, with their status (open, accepted, archived), author and where they came from (web or mcp).",
      inputSchema: {
        type: "object",
        properties: { status: { type: "string", enum: ["open", "accepted", "archived"] } },
        additionalProperties: false,
      },
      run: async ({ status }, me) => listProposals(db, me, status),
    },
    {
      name: "archive_proposal",
      description:
        "Archive a proposal of your own that is still open: one a newer proposal of yours replaces, or one you no longer stand by. Only one made over MCP by this token's admin, never anyone else's or one made on the page. It ends archived, its branch kept as a side line in the history; accepting stays a person's, on the Proposals page.",
      inputSchema: {
        type: "object",
        properties: { proposal: { type: "string", description: "the proposal's id (list_proposals gives it, with its author and where it came from)" } },
        required: ["proposal"],
        additionalProperties: false,
      },
      run: async ({ proposal }, me) => archiveOwn(db, me, `${proposal ?? ""}`),
    },
  ];

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
        return reply(msg.id, {
          protocolVersion: PROTOCOL,
          capabilities: { tools: {} },
          serverInfo: { name: "play.maia.city", version: "1" },
          instructions:
            "Maia City's asset library and its stories. Read assets, versions, their readable sources and recipe files, and every step of an asset's history (asset_history, get_asset at a step); propose new versions or assets as readable source, or draft a version step by step with asset_edit and propose the draft. Read stories (films as timelines of tracks and clips: storyboard shots, voice, notes) and propose new stories or new versions of them, every field of every clip editable, adding their storyboard images with add_story_frame. Read the sandboxes (get_sandbox: what each draws, at which version, and how it lays it out) and propose changes of them (propose_sandbox_change). Proposals go to Maia City's admins, who read the source and see it built in the sandboxed asset box, or play a story's timeline, on play's Proposals page, then accept or archive it; nothing here accepts, an agent archives only its own open proposals (archive_proposal), and no proposed code runs on play's server.",
        });
      case "ping":
        return reply(msg.id, {});
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
          if (e instanceof ProposalError || e instanceof NotFound || e instanceof StoryError || e instanceof SandboxError || e instanceof AssetDocError || (e as Error)?.name === "Denied" || (e as any)?.status)
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
