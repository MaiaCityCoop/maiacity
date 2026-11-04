/**
 * The asset groups, each its own app on the dashboard (Samuel 2026-11-04), in the order they stand there: the key in
 * play's database, its name, its page and its icon. The group `actors` is shown as Animals; its key stays `actors`
 * (the API, the MCP tools and every recipe name it so).
 */
export const GROUP_APPS = [
	{ grp: 'plants', label: 'Plants', href: '/plants/', note: 'Grown from a seed, every stage', icon: 'leaf' },
	{ grp: 'actors', label: 'Animals', href: '/animals/', note: 'Rigged to move, with their calls', icon: 'paw' },
	{ grp: 'things', label: 'Things', href: '/things/', note: 'Props and furniture', icon: 'box' },
	{ grp: 'machines', label: 'Machines', href: '/machines/', note: 'Moving parts, real physics', icon: 'gear' },
	{ grp: 'buildings', label: 'Buildings', href: '/buildings/', note: 'Tents, domes, containers', icon: 'building' },
	{ grp: 'biomes', label: 'Biomes', href: '/biomes/', note: 'The floor a world stands on', icon: 'mountain' }
] as const;

/** a group's name, by its key */
export const GROUPS: Record<string, string> = Object.fromEntries(GROUP_APPS.map((g) => [g.grp, g.label]));
