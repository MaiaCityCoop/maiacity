// Whom the person acts as (the nav pill's You menu, as legacy's switched vaults): themselves, or Maia City, the coop
// that owns every asset, for its admins. Kept on this device; an admin acting as Maia City sees the coop's work on the
// dashboard (members, invites, proposals to decide).
import { isAdmin } from './session.svelte';

const KEY = 'play.acting';
const read = () => {
	try {
		return localStorage.getItem(KEY) === 'maia-city' ? 'maia-city' : 'me';
	} catch {
		return 'me';
	}
};

export const acting = $state<{ as: 'me' | 'maia-city' }>({ as: typeof localStorage === 'undefined' ? 'me' : read() });

export function actAs(as: 'me' | 'maia-city') {
	acting.as = as === 'maia-city' && isAdmin() ? 'maia-city' : 'me';
	try {
		localStorage.setItem(KEY, acting.as);
	} catch {
		// a private window keeps it for the page alone
	}
}

/** acting as Maia City: only an admin, and only once they picked it */
export const asCity = () => acting.as === 'maia-city' && isAdmin();
