// play's MCP server (/api/mcp, Streamable HTTP, stateless): an agent works on Maia City's assets for an admin, by that
// admin's access token (./tokens.ts, `Authorization: Bearer play_…`). It reads the assets, their versions and their
// recipe files, and proposes new versions and new assets, filed as the admin's proposals with `via` 'mcp'. Accepting or
// rejecting stays a person's, on the Proposals page (Samuel 2026-11-02): no tool here decides.
import type { BlobStore } from "./blobs";
import type { Db } from "./pg";
import type { Me } from "./access";
import { assetOf, listAssets, NotFound } from "./assets";
import { listProposals, propose, ProposalError } from "./proposals";
import { adminByToken } from "./tokens";

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
  "in the asset box, the sandboxed frame in the page, never on play's server. Start from the head's source where it has one (get_asset " +
  "gives its hash, get_file its text); imported versions have only their minified recipe file, to read for how they are built.";

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
            "Maia City's asset library. Read assets, versions, their readable sources and recipe files; propose new versions or assets as readable source. Proposals go to Maia City's admins, who read the source and see it built in the sandboxed asset box on play's Proposals page, then accept or reject it; nothing here decides, and no proposed code runs on play's server.",
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
          if (e instanceof ProposalError || e instanceof NotFound || (e as Error)?.name === "Denied" || (e as any)?.status)
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
