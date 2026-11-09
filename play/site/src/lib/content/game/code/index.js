// @ts-nocheck
// A sandbox's config, from play's database (/api/sandboxes/<id>/config): its pins as `configs/<id>/assets`, each slot
// the build it pins (`<hash>?values`), and each other config it keeps (Sandbox 1's garden as `configs/<id>/garden`,
// every planting with the build of its slot as `asset`). Loaded once before the sandbox's world starts (`loadConfig`).

class CodeError extends Error {}

const CONFIGS = new Map();
const loading = new Map();

/**
 * the layout sandbox `id` is opened with, as its config's query: an intent's (`?layout=<id>/<intent>`, from the
 * intents' board), to walk the sandbox as its change would make it before an admin decides; a version or an edit of
 * its layout's history (`?layout=<id>/v3`, `?layout=<id>/e12`, from its History on /sandboxes/<id>/); else ''
 */
function layoutOf(id) {
	if (typeof location === 'undefined') return '';
	const l = new URLSearchParams(location.search).get('layout') ?? '';
	if (!l.startsWith(`${id}/`)) return '';
	const at = l.slice(id.length + 1);
	const m = /^([ve])(\d+)$/.exec(at);
	if (m) return `?${m[1] === 'v' ? 'v' : 'edit'}=${m[2]}`;
	return `?intent=${encodeURIComponent(at)}`;
}

/** where a config of sandbox `id` (its UUID) is kept, by its name (`assets`, its pins; `garden` …) @param {string} id @param {string} name */
export const configKey = (id, name) => `configs/${id}/${name}`;

/** the config of sandbox `id`, read once a page */
export function loadConfig(id) {
	if (!loading.has(id)) {
		const url = `/api/sandboxes/${encodeURIComponent(id)}/config${layoutOf(id)}`;
		loading.set(
			id,
			fetch(url, { credentials: 'same-origin' }).then(async (res) => {
				if (!res.ok) {
					loading.delete(id);
					throw new CodeError(`${id}'s config could not be read (HTTP ${res.status})`);
				}
				const { sandbox: _, ...configs } = await res.json();
				for (const [name, data] of Object.entries(configs)) CONFIGS.set(configKey(id, name), data);
				return configs;
			})
		);
	}
	return loading.get(id);
}

/** the config at `configs/<id>/<name>`, once its sandbox's config is in; else CodeError */
export function configAt(ref) {
	if (!CONFIGS.has(ref)) throw new CodeError(`${ref} is not loaded (its sandbox's config: loadConfig)`);
	return CONFIGS.get(ref);
}
