/**
 * The proposals board as a modal (Samuel 2026-11-05): opened from the nav pill's star over whatever page is open
 * ($lib/site/app/NavPill.svelte), not a page of its own or a tile among the apps. Admins only for now; everyone else
 * sees the star greyed out. The layout shows it while it is open (./ProposalsModal.svelte), and the address that named
 * the board before (/proposals/, a link from a page, a new tab) opens it.
 */
export const proposalsModal = $state({ open: false });
export const openProposals = () => (proposalsModal.open = true);
export const closeProposals = () => (proposalsModal.open = false);
export const toggleProposals = () => (proposalsModal.open = !proposalsModal.open);
