// An admins' page (Samuel 2026-11-02: these are the admins' for now): anyone else is sent to the dashboard. A page is
// drawn only once someone is signed in (routes/+layout.svelte), so the one signed in is known here.
import { goto } from '$app/navigation';
import { isAdmin } from './session.svelte';

/** call it as an admins' page starts: it sends anyone else to the dashboard, and says whether they are an admin */
export function adminsOnly() {
	$effect(() => {
		if (!isAdmin()) void goto('/', { replaceState: true });
	});
	return isAdmin;
}
