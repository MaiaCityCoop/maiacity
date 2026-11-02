// @ts-nocheck
// A sandbox's config, from play's database (/api/sandboxes/<id>/config): its pins as `configs/<id>/assets`, each slot
// the build it pins (`<hash>?values`), and each other config it keeps (Sandbox 1's garden as `configs/<id>/garden`,
// every planting with the build of its slot as `asset`). Loaded once before the sandbox's world starts (`loadConfig`).

export class CodeError extends Error {}

const CONFIGS = new Map();
const loading = new Map();

/** the config of sandbox `id`, read once a page */
export function loadConfig(id) {
	if (!loading.has(id))
		loading.set(
			id,
			fetch(`/api/sandboxes/${encodeURIComponent(id)}/config`, { credentials: 'same-origin' }).then(async (res) => {
				if (!res.ok) {
					loading.delete(id);
					throw new CodeError(`${id}'s config could not be read (HTTP ${res.status})`);
				}
				const { sandbox: _, ...configs } = await res.json();
				for (const [name, data] of Object.entries(configs)) CONFIGS.set(`configs/${id}/${name}`, data);
				return configs;
			})
		);
	return loading.get(id);
}

/** the config at `configs/<id>/<name>`, once its sandbox's config is in; else CodeError */
export function configAt(ref) {
	if (!CONFIGS.has(ref)) throw new CodeError(`${ref} is not loaded (its sandbox's config: loadConfig)`);
	return CONFIGS.get(ref);
}
