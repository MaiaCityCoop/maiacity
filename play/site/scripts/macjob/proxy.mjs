// The read-only proxy to play every Mac job starts (intent cb52fbd9; before, copied into each job's script): on
// 127.0.0.1:<port> (3911, what the dev servers' PLAY_API names), GET and HEAD of /api/… only, sent to play.maia.city
// with the admin token in PLAY_MCP_TOKEN (the header goes to play and nowhere else). Resolves to the server; close it.
import { createServer } from 'node:http';

export const PLAY = 'https://play.maia.city';

export async function playProxy(port = 3911) {
	const token = process.env.PLAY_MCP_TOKEN;
	if (!token) throw new Error('PLAY_MCP_TOKEN: the admin token the proxy reads play with');
	const proxy = createServer(async (req, res) => {
		if (!['GET', 'HEAD'].includes(req.method ?? '') || !req.url?.startsWith('/api/')) return res.writeHead(405).end('read-only');
		try {
			const r = await fetch(PLAY + req.url, { method: req.method, headers: { authorization: `Bearer ${token}`, accept: req.headers.accept ?? '*/*', ...(req.headers.range ? { range: req.headers.range } : {}) } });
			const h = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
			res.writeHead(r.status, h);
			res.end(Buffer.from(await r.arrayBuffer()));
		} catch (err) {
			res.writeHead(502).end(String(err));
		}
	});
	await new Promise((ok) => proxy.listen(port, '127.0.0.1', ok));
	return proxy;
}
