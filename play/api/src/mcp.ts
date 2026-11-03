// play's MCP server (/api/mcp, Streamable HTTP, stateless): an agent works on Maia City's assets and stories for an
// admin, by that admin's access token (./tokens.ts, `Authorization: Bearer play_…`). It reads the assets, their versions
// and their recipe files, and proposes new versions and new assets; it reads the stories (./stories.ts) and proposes new
// stories and new versions of them, with the storyboard images they show. All are filed as the admin's proposals with
// `via` 'mcp'. Accepting or rejecting stays a person's, on the Proposals page (Samuel 2026-11-02): no tool here decides.
import type { BlobStore } from "./blobs";
import type { Db } from "./pg";
import type { Me } from "./access";
import { assetOf, listAssets, NotFound } from "./assets";
import { listProposals, propose, ProposalError } from "./proposals";
import { adminByToken } from "./tokens";
import { admin, listStories, MOST_FRAME, proposeStory, putFrameBase64, storyOf, StoryError } from "./stories";

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
  "A clip may carry more fields, and a track may be of another kind (music, sfx, callout, scene): they are kept as given. " +
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
      description: "One asset by its id, with all its versions, newest first: each version's number, note, author, who accepted it, its recipe file's hash and its readable source's hash where it has one (and its variants').",
      inputSchema: { type: "object", properties: { asset: { type: "string", description: "the asset's id (UUID)" } }, required: ["asset"], additionalProperties: false },
      run: async ({ asset }) => assetOf(db, `${asset}`),
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
      description: `Propose a new version of an asset. It goes to Maia City's admins as a proposal (via MCP), to accept or reject on the Proposals page. ${RECIPE_RULE}`,
      inputSchema: {
        type: "object",
        properties: {
          asset: { type: "string", description: "the asset's id (UUID)" },
          source: { type: "string", description: "the new version's readable source (see above)" },
          note: { type: "string", description: "what changed and why, for the admins deciding" },
          base: { type: "string", description: "the head version's id it was made from (from get_asset); refused if the asset moved on since" },
        },
        required: ["asset", "source", "note"],
        additionalProperties: false,
      },
      run: async ({ asset, source, note, base }, me) => propose(db, store, me, { asset, source: `${source ?? ""}`, note, ...(base ? { base } : {}) }, "mcp"),
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
    // ---- stories: a film as one timeline of tracks and clips (./stories.ts, play/SPEC.md §12)
    {
      name: "list_stories",
      description: "Maia City's stories (films as timelines, played on play's Stories page): id, title, head version number, how many accepted versions, duration in seconds, how many shots and tracks.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      run: async (_args, me) => listStories(db, me),
    },
    {
      name: "get_story",
      description: `One story's whole timeline, at its head or at an accepted version: ${STORY_FORMAT} It also lists the story's versions (number, id, note, author, who accepted it). Use its \`version\` as \`base\` when you propose a change.`,
      inputSchema: {
        type: "object",
        properties: { story: { type: "string", description: "the story's id (a slug, from list_stories)" }, version: { type: "integer", minimum: 1, description: "an accepted version's number; the head if left out" } },
        required: ["story"],
        additionalProperties: false,
      },
      run: async ({ story, version }, me) => storyOf(db, me, `${story ?? ""}`, version == null ? undefined : Number(version)),
    },
    {
      name: "propose_story",
      description: `Propose a new story, its first version, as its whole timeline. It goes to Maia City's admins as a proposal (via MCP), who play it in the Stories player on the Proposals page and accept or reject it. ${STORY_FORMAT} Add each storyboard image first with add_story_frame and use the hashes it gives as the shots' frames.`,
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
        `{ op: 'set', fields: { format?, fps? } }. On shots, voice and notes tracks clips must not overlap, so retime with shift. ${STORY_FORMAT} It goes to the admins as a proposal (via MCP), shown against the head clip by clip.`,
      inputSchema: {
        type: "object",
        properties: {
          story: { type: "string", description: "the story's id" },
          note: { type: "string", description: "what changed and why, for the admins deciding" },
          base: { type: "string", description: "the head version's id it was made from (get_story's `version`); refused if the story moved on since" },
          title: { type: "string", description: "a new title, if it changes" },
          body: { type: "object", description: "the whole new timeline (instead of edits)" },
          edits: { type: "array", items: { type: "object" }, description: "edits applied in order to the head's timeline (instead of body)" },
        },
        required: ["story", "note"],
        additionalProperties: false,
      },
      run: async ({ story, note, base, title, body, edits }, me) => proposeStory(db, me, { story, note, title, body, edits, ...(base ? { base } : {}) }, false),
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
      name: "list_proposals",
      description: "The proposals, newest first, with their status (open, accepted, rejected, withdrawn, stale), author and where they came from (web or mcp).",
      inputSchema: {
        type: "object",
        properties: { status: { type: "string", enum: ["open", "accepted", "rejected", "withdrawn", "stale"] } },
        additionalProperties: false,
      },
      run: async ({ status }, me) => listProposals(db, me, status),
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
            "Maia City's asset library and its stories. Read assets, versions, their readable sources and recipe files; propose new versions or assets as readable source. Read stories (films as timelines of tracks and clips: storyboard shots, voice, notes) and propose new stories or new versions of them, every field of every clip editable, adding their storyboard images with add_story_frame. Proposals go to Maia City's admins, who read the source and see it built in the sandboxed asset box, or play a story's timeline, on play's Proposals page, then accept or reject it; nothing here decides, and no proposed code runs on play's server.",
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
          if (e instanceof ProposalError || e instanceof NotFound || e instanceof StoryError || (e as Error)?.name === "Denied" || (e as any)?.status)
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
