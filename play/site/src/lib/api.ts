// play's API, same origin (/api behind Caddy; the dev server proxies it)
import { hashText } from '$lib/kernel/hash.js';

export class ApiError extends Error {
	constructor(message: string, public status: number) {
		super(message);
	}
}

// a read the proxy couldn't get an answer to (502, 503, 504: the API restarting or busy for a moment) is asked again,
// twice, before the page says so; a write never is, so nothing is done twice
export const NO_ANSWER = new Set([502, 503, 504]);
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
		if (!NO_ANSWER.has(r.status) || rest.signal?.aborted) break;
		await new Promise((ok) => setTimeout(ok, wait));
		r = await ask();
	}
	if (NO_ANSWER.has(r.status)) throw new ApiError('play is busy for a moment and did not answer (HTTP ' + r.status + '): please reload.', r.status);
	const data = await r.json().catch(() => ({}));
	if (!r.ok) throw new ApiError(data?.error ?? `HTTP ${r.status}`, r.status);
	return data as T;
}

export type Level = 'admin' | 'citizen' | 'traveler';
export type Me = { id: string; name: string; level: Level; may: Record<string, string[]>; founder: number | null };
export const may = (me: Me | null, action: string, what: string) => !!me?.may?.[action]?.some((x) => x === '*' || x === what);

/** play's file named by its BLAKE3 hash (play/SPEC.md §4.5) */
export const fileUrl = (hash: string) => `/api/files/${hash}`;

async function file(hash: string, init?: RequestInit) {
	const r = await fetch(fileUrl(hash), { credentials: 'same-origin', ...init });
	if (!r.ok) throw new ApiError(`file ${hash.slice(0, 10)}…: HTTP ${r.status}`, r.status);
	return r;
}

/** a file the site itself serves (a frozen engine, a font), as a blob */
export async function siteBlob(url: string) {
	const r = await fetch(url, { credentials: 'same-origin' });
	if (!r.ok) throw new ApiError(`${url}: HTTP ${r.status}`, r.status);
	return r.blob();
}

export const fileBlob = (hash: string, init?: RequestInit) => file(hash, init).then((r) => r.blob());
export const fileBytes = (hash: string, init?: RequestInit) => file(hash, init).then((r) => r.arrayBuffer());

/** a text file, held to its hash: a file that is not the bytes its name says is refused */
export async function fileText(hash: string, init?: RequestInit) {
	const text = await (await file(hash, init)).text();
	if (hashText(text) !== hash) throw new ApiError(`file ${hash.slice(0, 10)}… does not hash to its name`, 0);
	return text;
}
