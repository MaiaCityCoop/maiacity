// bun mcp.ts <tool> <args.json>: one call to play's MCP with the operator's token; prints the result
const [tool, file] = process.argv.slice(2);
const args = JSON.parse(await Bun.file(file).text());
const res = await fetch("https://play.maia.city/api/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}` },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } }),
});
const text = await res.text();
const json = text.startsWith("{") ? JSON.parse(text) : JSON.parse(text.split("\n").find((l) => l.startsWith("data:"))!.slice(5));
const out = json.error ?? json.result;
console.log(JSON.stringify(out.structuredContent ?? out.content?.map((c: any) => c.text).join("\n") ?? out));
if (json.error || out.isError) process.exit(1);
