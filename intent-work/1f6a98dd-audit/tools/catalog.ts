import { pinnedRoute } from '/home/user/maiacity/play/site/scripts/census/pinned';
const r = pinnedRoute('/home/user/maiacity/play/site/scripts/census/inputs', '/api/catalog') as any;
const body = JSON.parse(r.body);
await Bun.write(process.argv[2], JSON.stringify(body));
const sh = (v: any, d = 0): any => Array.isArray(v) ? [v.length, d < 3 && v.length ? sh(v[0], d + 1) : ''] : v && typeof v === 'object' ? (d > 3 ? '{…}' : Object.fromEntries(Object.entries(v).slice(0, 25).map(([k, x]) => [k, sh(x, d + 1)]))) : typeof v === 'string' ? v.slice(0, 30) : v;
console.log(JSON.stringify(sh(body)).slice(0, 2500));
