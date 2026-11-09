// How play's pages write a date and a person (only shown, never read back).

/** a moment in the reader's own way: "9 Nov 2026, 16:27" */
export const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** a moment, short: "4 Nov, 16:27" */
export const shortWhen = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** a moment as a list reads it: "4 Nov 2026, 16:27" */
export const listWhen = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** a day: "4 Nov 2026" */
export const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** a day, in figures: "04/11/2026" */
export const figuresDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB');

/** a day of the calendar with its weekday, in the reader's way: "Wed 4 Nov" */
export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** a day as the reader writes one */
export const localDay = (iso: string) => new Date(iso).toLocaleDateString();

/** a date of the calendar (`2026-11-04`, no time of day): "4 Nov 2026", the same in every time zone */
export const calendarDay = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** a person's initials, for a round badge: "Samuel Gómez" → "SG" */
export const initialsOf = (name: string | null | undefined) =>
	(name ?? '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
