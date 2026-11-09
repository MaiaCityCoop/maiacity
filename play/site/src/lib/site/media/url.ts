// A media file by its hash (`<hash>` or `<hash>.<ending>`): served by play from its own files, each held to its BLAKE3
// hash there. A static path of the site's, or a page's own object URL, as it is.
import { fileUrl } from '$lib/api';

const NAMED = /^([0-9a-f]{64})(?:\.[a-z0-9]+)?$/;

export function asset(ref: string): string;
export function asset(ref: string | undefined | null): string | undefined;
export function asset(ref: string | undefined | null) {
	if (!ref) return undefined;
	const m = NAMED.exec(ref);
	return m ? fileUrl(m[1]) : ref;
}
