// What a viewer's own browser keeps for them (a folded column, whom they act as): localStorage, which a private window
// or blocked site data makes throw on any read or write. Then nothing is kept and the page goes on without it.

/** the value kept under `key`, or null (none, or no storage) */
export function kept(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/** the JSON kept under `key`, or null (none, no storage, or not JSON) */
export function keptJson(key: string): unknown {
	const text = kept(key);
	if (text === null) return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

/** keeps `value` under `key`; false where this browser keeps nothing */
export function keep(key: string, value: string): boolean {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}
