// WHAT EVERY SCREENSHOT AND PAGE CHECK SHARES (intent 42a96129's reduce): the site it opens, the two screens it is
// looked at on, and who is signed in. Six scripts each carried their own copy before.

/** the site: the dev server unless SITE names another */
export const SITE = process.env.SITE ?? 'http://localhost:5173';
/** the screens a page is looked at on: a phone and a desktop (and a tablet where a script asks for it) */
export const PHONE = { width: 390, height: 844 };
export const TABLET = { width: 820, height: 1180 };
export const DESKTOP = { width: 1440, height: 900 };
/** who is signed in, as `/api/me` answers: an admin, and a member who is none */
export const ADMIN = { id: '00000000-0000-4000-8000-000000000001', name: 'Samuel', level: 'admin', may: {}, founder: 1 };
export const TRAVELER = { id: '00000000-0000-4000-8000-000000000002', name: 'A traveler', level: 'traveler', may: {} };
