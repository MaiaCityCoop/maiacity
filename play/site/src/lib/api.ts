// play's API, same origin (/api behind Caddy; the dev server proxies it)
export class ApiError extends Error {
	constructor(message: string, public status: number) {
		super(message);
	}
}

export async function api<T = any>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
	const { json, ...rest } = init;
	const r = await fetch(`/api${path}`, {
		credentials: 'same-origin',
		...rest,
		method: rest.method ?? (json === undefined ? 'GET' : 'POST'),
		headers: { ...(json === undefined ? {} : { 'content-type': 'application/json' }), ...(rest.headers ?? {}) },
		body: json === undefined ? rest.body : JSON.stringify(json)
	});
	const data = await r.json().catch(() => ({}));
	if (!r.ok) throw new ApiError(data?.error ?? `HTTP ${r.status}`, r.status);
	return data as T;
}

export type Level = 'admin' | 'citizen' | 'traveler';
export type Me = { id: string; name: string; level: Level; may: Record<string, string[]> };
export const may = (me: Me | null, action: string, what: string) => !!me?.may?.[action]?.some((x) => x === '*' || x === what);
