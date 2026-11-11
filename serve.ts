const T = '/home/user/maiacity/play/site/node_modules/three'; const SRC = process.argv[2];
Bun.serve({ port: 7788, fetch(req) { const p = new URL(req.url).pathname;
  const f = p === '/' ? '/tmp/claude-0/bench/page.html' : p.startsWith('/three/') ? T + p.slice(6) : p.startsWith('/src/') ? SRC + p.slice(4) : null;
  return f ? new Response(Bun.file(f), { headers: { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'text/plain' } }) : new Response('no', { status: 404 }); } });
