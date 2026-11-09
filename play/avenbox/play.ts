// play's MCP as the box's scripts call it (intent.ts, pr-intent.ts, skills.ts, live-audit.ts): one JSON-RPC client.
// intents-pr.yml hands intent.ts to the box's run with this file beside it.

/** play itself: PLAY_URL, else play.maia.city */
export const PLAY_SITE = (process.env.PLAY_URL || "https://play.maia.city").replace(/\/$/, "");
/** play's MCP endpoint: PLAY_MCP_URL, else PLAY_SITE's */
export const PLAY_MCP = process.env.PLAY_MCP_URL || `${PLAY_SITE}/api/mcp`;

type Where = { endpoint?: string; token?: string };
let rpcId = 0;

/** a play MCP tool's answer: its text, and whether the tool said it is an error; throws when play does not answer */
export async function call(name: string, args: Record<string, unknown>, { endpoint = PLAY_MCP, token = process.env.PLAY_MCP_TOKEN }: Where = {}) {
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } }),
  });
  if (!r.ok) throw new Error(`${name}: play answered ${r.status} ${await r.text()}`);
  const body = (await r.json()) as { error?: { message: string }; result?: { isError?: boolean; content?: { text?: string }[] } };
  if (body.error) throw new Error(`${name}: ${body.error.message}`);
  return { isError: !body.result || !!body.result.isError, text: body.result?.content?.[0]?.text ?? "" };
}

/** a play MCP tool: its result as JSON, or it throws with the tool's own words */
export async function tool(name: string, args: Record<string, unknown>, where: Where = {}) {
  const { isError, text } = await call(name, args, where);
  if (isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
}
