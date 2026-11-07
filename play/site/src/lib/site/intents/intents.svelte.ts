/**
 * The intents' board as a modal (Samuel 2026-11-05; named the intents 2026-11-06): opened from the nav pill's star over
 * whatever page is open (./IntentsModal.svelte), closed by Back, the star, Escape or its Close. Admins only: everyone
 * else sees the star greyed out. The layout shows it while it is open, and the address that names the board (/intents/;
 * a link from a page, a new tab) opens it, with the intent its #hash names opened on it (`focus`: an intent's id).
 */
export const intentsModal = $state<{ open: boolean; focus: string | null }>({ open: false, focus: null });
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const openIntents = (focus?: string | null) => {
	intentsModal.focus = focus && ID.test(focus) ? focus.toLowerCase() : null;
	intentsModal.open = true;
};
export const closeIntents = () => (intentsModal.open = false);
export const toggleIntents = () => (intentsModal.open = !intentsModal.open);
