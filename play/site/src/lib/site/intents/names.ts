// What the board and the detail call an intent's kind and its work (only shown: everything is named by its UUID).
import type { Kind, Work } from './detail';

/** an intent's kind, shown as what it asks (the kind 'idea' as Make, the stage Idea being its own; Samuel 2026-11-06) */
export const KIND_NAME: Record<Kind, string> = { idea: 'Make', fix: 'Fix', improve: 'Improve' };
export const kindName = (k: Kind) => KIND_NAME[k] ?? k;

/** what a work is of, its card's tag (Samuel 2026-11-05: the type, not how it came), by its group */
const TYPE_OF_GROUP: Record<string, string> = { plants: 'Plant', things: 'Thing', machines: 'Machine', buildings: 'Building', actors: 'Actor', characters: 'Character', biomes: 'Biome', worlds: 'World', sandboxes: 'Sandbox' };
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

/** a work's type: its group's, else what it is ("Story"), else its group */
export const typeOf = (w: { what?: string | null; grp?: string | null }) => TYPE_OF_GROUP[w.grp ?? ''] ?? (w.what ? capital(w.what) : (w.grp ?? ''));

/** a document's type, as the detail lists the documents of a work: its group's, else what it is, else its kind */
export const docTypeOf = (doc: { group?: string; what?: string; kind: string }) => TYPE_OF_GROUP[doc.group ?? ''] ?? (doc.what ? capital(doc.what) : doc.kind);

/** the version a work would be: "v3", or "a change" where it is no numbered version */
export const titleOf = (w: Pick<Work, 'number'>) => (w.number == null ? 'a change' : `v${w.number}`);
