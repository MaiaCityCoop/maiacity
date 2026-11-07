// Call one of play's MCP tools from the shell (Streamable HTTP, JSON-RPC), with the admin token in PLAY_MCP_TOKEN,
// sent to play only. usage: bun mcp.ts <tool> <args.json | -> ; prints the tool's text result.
const [tool, file] = process.argv.slice(2);
const args = JSON.parse(file === '-' ? await Bun.stdin.text() : await Bun.file(file).text());
const url = 'https://play.maia.city/api/mcp';
const head: Record<string, string> = { authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
async function rpc(body: object) {
	const r = await fetch(url, { method: 'POST', headers: head, body: JSON.stringify(body) });
	const sid = r.headers.get('mcp-session-id');
	if (sid) head['mcp-session-id'] = sid;
	const t = await r.text();
	if (!r.ok) throw new Error(`${r.status}: ${t.slice(0, 500)}`);
	const json = t.trim().startsWith('{') ? t : t.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5)).pop() ?? '{}';
	return JSON.parse(json || '{}');
}
await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'coconut-film', version: '1' } } });
await fetch(url, { method: 'POST', headers: head, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
const out = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: tool, arguments: args } });
if (out.error) throw new Error(JSON.stringify(out.error));
console.log((out.result?.content ?? []).map((c: any) => c.text).join('\n'));
if (out.result?.isError) process.exit(1);
