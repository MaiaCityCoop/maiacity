// How often one address may ask play's costly routes: the passkey ceremonies (/api/passkey/*) and proposals' uploads
// (POST /api/intents, an intent put at Proposal with its work). Copied from aven/api/src/limits.js. A token bucket for each address, filled at `API_RATE` asks a minute (30 by
// default, 0 for no limit), as a feed limits its signed routes. The address is
// the last the proxy in front names in `X-Forwarded-For` (Caddy sets it), else the socket's.

/** The addresses a rate remembers at most: past it, it forgets the one heard from longest ago. */
const ADDRESSES = 16_384;

/** A token bucket for each address: `perMinute` asks a minute, as many at once; none limits nobody. */
export class Rate {
  /** by address, the one heard from last, last */
  buckets = new Map<string, { tokens: number; at: number }>();
  constructor(public perMinute: number, public most = ADDRESSES) {}

  /** Whether `address` may ask now, at `now` ms, taking one of its tokens if so. @param {string} address @param {number} [now] */
  allows(address: string, now = Date.now()) {
    if (!(this.perMinute > 0)) return true;
    const had = this.buckets.get(address);
    const tokens = had ? Math.min(this.perMinute, had.tokens + ((now - had.at) / 60_000) * this.perMinute) : this.perMinute;
    this.buckets.delete(address);
    if (this.buckets.size >= this.most) this.buckets.delete(this.buckets.keys().next().value as string);
    const may = tokens >= 1;
    this.buckets.set(address, { tokens: may ? tokens - 1 : tokens, at: now });
    return may;
  }
}

/** The asks a minute `API_RATE` says, 30 unless it says otherwise. @param {string | undefined} said */
export function perMinute(said: string | undefined) {
  if (said == null || said.trim() === "") return 30;
  const n = Number(said);
  if (!Number.isFinite(n) || n < 0) throw new Error(`API_RATE is the asks a minute, 0 for no limit: not ${said}`);
  return n;
}

/** Whether `req` asks a costly route: a passkey ceremony, a proposal's upload, or an agent's call over MCP. @param {Request} req */
export function costly(req: Request) {
  if (req.method === "OPTIONS") return false;
  const path = new URL(req.url).pathname;
  return path.startsWith("/api/passkey/") || (req.method === "POST" && (path === "/api/intents" || path === "/api/mcp"));
}

/** Who asks: the last address the proxy names, else the socket's, else nobody known.
 *  @param {Request} req @param {{ requestIP?: (r: Request) => { address: string } | null } | undefined} server */
export function clientOf(req: Request, server?: { requestIP?: (r: Request) => { address: string } | null }) {
  const forwarded = req.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").pop()?.trim();
  if (last) return last;
  return server?.requestIP?.(req)?.address ?? "unknown";
}
