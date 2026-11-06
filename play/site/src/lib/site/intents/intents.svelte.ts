/**
 * The intents' board as a modal (Samuel 2026-11-05; named the intents 2026-11-06): opened from the nav pill's star over
 * whatever page is open (./IntentsModal.svelte), closed by Back, the star, Escape or its Close. Admins only: everyone
 * else sees the star greyed out. The layout shows it while it is open, and the addresses that name the board (/intents/,
 * and /proposals/ from before; a link from a page, a new tab) open it.
 */
export const intentsModal = $state({ open: false });
export const openIntents = () => (intentsModal.open = true);
export const closeIntents = () => (intentsModal.open = false);
export const toggleIntents = () => (intentsModal.open = !intentsModal.open);
