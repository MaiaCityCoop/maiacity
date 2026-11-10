// @ts-nocheck — plain JS
/** where a file of play's is read, by its hash (play/SPEC.md §4.5), on play's own origin @param {string} hash */
export const fileUrl = (hash) => `/api/files/${hash}`;
