// read-only proxy: localhost:3911 → play.maia.city, GET/HEAD only, the MCP token as Bearer (play's read-only world routes)
const UP = 'https://play.maia.city';
Bun.serve({ port: 3911, idleTimeout: 120, async fetch(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('read-only', { status: 405 });
  const u = new URL(req.url);
  const r = await fetch(UP + u.pathname + u.search, { headers: { authorization: `Bearer ${process.env.PLAY_MCP_TOKEN}`, accept: req.headers.get('accept') ?? '*/*' } });
  const h = new Headers(r.headers); h.delete('content-encoding'); h.delete('content-length');
  return new Response(r.body, { status: r.status, headers: h });
}});
console.log('proxy on 3911');
