// THE GALLERY'S SLOTS (intent 42a96129): where demo properties will be shown. Today every slot is a placeholder
// (`ref: null`). A slot takes a world by its UUID (a sandbox's or an asset's) or a video by its file's BLAKE3 hash
// (play/SPEC.md §4.7): never a title, a label or a path.

export type Slot = { kind: 'world'; ref: string | null } | { kind: 'video'; ref: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HASH = /^[0-9a-f]{64}$/;

/** a slot, held to its form: a world's ref a UUID, a video's a hash, or none yet; anything else is refused */
export function slot(kind: string, ref: string | null = null): Slot {
	if (kind !== 'world' && kind !== 'video') throw new Error(`a slot is a world or a video, not "${kind}"`);
	if (ref !== null && !(kind === 'world' ? UUID : HASH).test(ref))
		throw new Error(kind === 'world' ? 'a world is named by its UUID' : "a video is named by its file's hash");
	return { kind, ref };
}

/** whether a slot still waits for its demo */
export const isPlaceholder = (s: Slot) => s.ref === null;

/** the page's slots: five worlds and four videos, none filled yet */
export const SLOTS: readonly Slot[] = [
	slot('world'), slot('video'), slot('world'),
	slot('world'), slot('video'), slot('world'),
	slot('video'), slot('world'), slot('video')
];
