// play's API, same origin (/api behind Caddy; the dev server proxies it)
export class ApiError extends Error {
	constructor(message: string, public status: number) {
		super(message);
	}
}

// a read the proxy couldn't get an answer to (502, 503, 504: the API restarting or busy for a moment) is asked again,
// twice, before the page says so; a write never is, so nothing is done twice
const GATEWAY = new Set([502, 503, 504]);
const RETRIES = [1000, 3000];

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
	const { json, ...rest } = init;
	const method = rest.method ?? (json === undefined ? 'GET' : 'POST');
	const ask = () =>
		fetch(`/api${path}`, {
			credentials: 'same-origin',
			...rest,
			method,
			headers: { ...(json === undefined ? {} : { 'content-type': 'application/json' }), ...(rest.headers ?? {}) },
			body: json === undefined ? rest.body : JSON.stringify(json)
		});
	let r = await ask();
	for (const wait of method === 'GET' ? RETRIES : []) {
		if (!GATEWAY.has(r.status) || rest.signal?.aborted) break;
		await new Promise((ok) => setTimeout(ok, wait));
		r = await ask();
	}
	if (GATEWAY.has(r.status)) throw new ApiError('play is busy for a moment and did not answer (HTTP ' + r.status + '): please reload.', r.status);
	const data = await r.json().catch(() => ({}));
	if (!r.ok) throw new ApiError(data?.error ?? `HTTP ${r.status}`, r.status);
	return data as T;
}

export type Level = 'admin' | 'citizen' | 'traveler';
export type Me = { id: string; name: string; level: Level; may: Record<string, string[]>; founder: number | null };
export const may = (me: Me | null, action: string, what: string) => !!me?.may?.[action]?.some((x) => x === '*' || x === what);
