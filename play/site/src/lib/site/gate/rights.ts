// Everything on play is admins' only by default (intent aa751ecb, Samuel 2026-11-10: "by default it is admin only for all
// things, and we unlock one thing after another with specific roles that we come up with later"): one table of the
// rights the site's routes need, written once, read by the one gate (./Gate.svelte, which the root layout wraps every
// page in). A right is one the API checks too (play/api/src/access.ts `may`), held in a level's rule (play.level_rules,
// `/api/me`'s `may`): a route opens for a level once its rule gives the right, with no change here. A route the table
// does not name needs admin. Only the home page (signing in, an invite's sign-up) and a member's own profile are open.

/** what a route needs: `open` anyone (signed in or not, the page itself says), `read <what>` that right, `admin` an admin */
export type Need = { open: true } | { read: string } | { admin: true };

/** the table: a route (it and every page below it) and what it needs; the first that matches decides */
export const RIGHTS: readonly (readonly [route: string, need: Need])[] = [
	['/', { open: true }],
	['/profile', { open: true }],
	// the asset library, a page per group ($lib/app/groups.ts), and its asset pages
	...['/assets', '/plants', '/animals', '/things', '/machines', '/buildings', '/biomes', '/worlds'].map((r) => [r, { read: 'assets' }] as const),
	// the sandboxes and their layouts
	...['/sandboxes', ...[1, 2, 3, 4, 5, 6, 7].map((n) => `/sandbox-${n}`)].map((r) => [r, { read: 'sandboxes' }] as const),
	['/game', { read: 'game' }],
	['/stories', { read: 'stories' }]
];

/** whether `path` is `route` or a page below it (the home page only itself) */
const under = (path: string, route: string) =>
	route === '/' ? path === '/' : path === route || path === route + '/' || path.startsWith(route + '/');

/** what a path needs: its row of the table, else an admin */
export function needOf(path: string): Need {
	return RIGHTS.find(([route]) => under(path, route))?.[1] ?? { admin: true };
}

/** the one signed in, as the gate needs them: their level and their level's rule (`/api/me`'s `may`) */
export type Who = { level: string; may: Record<string, string[] | undefined> } | null;

/** whether `who` may `read what`, as the API's `may` (play/api/src/access.ts) decides it */
export const mayRead = (who: Who, what: string) => {
	const list = who?.may?.read ?? [];
	return list.includes('*') || list.includes(what);
};

/** whether `who` holds what a path needs */
export function holds(who: Who, need: Need) {
	if ('open' in need) return true;
	if ('read' in need) return mayRead(who, need.read);
	return who?.level === 'admin';
}

/**
 * what the gate draws for a path: `open` the page (an open route, or one whose right they hold), `wait` nothing while the
 * session loads, `soon` "Coming soon · Invite only" and none of the page
 */
export function gate(path: string, ready: boolean, who: Who): 'open' | 'wait' | 'soon' {
	const need = needOf(path);
	if ('open' in need) return 'open';
	if (!ready) return 'wait';
	return holds(who, need) ? 'open' : 'soon';
}
