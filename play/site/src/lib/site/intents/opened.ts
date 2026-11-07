// An intent's documents, each read when it is opened (intent 2df30a21): the detail lists them in brief (GET
// /api/intents/:id, its review's docs) and one document's change, field by field with its kind's extras (an asset's
// builds, a story's player, a layout's pins), is GET /api/intents/:id/docs/:doc[?variant=], read once and kept while
// the board is open. A piece held in several versions is named by its variant too.

/** a document as the detail lists it: its document, its variant, the version it grew from and what it changes in brief */
export type Listed = {
	doc: { id: string; kind: string; what?: string; label?: string; group?: string; breed?: string; open?: string | null } | null;
	variant: number | null;
	seedNumber: number | null;
	moved?: boolean;
	status?: string | null;
	summary?: { changes: number; fields: string[] };
};

/** the address of one document of an intent's work */
export const docPath = (intent: string, d: Pick<Listed, 'doc' | 'variant'>) =>
	`/intents/${intent}/docs/${d.doc?.id}${d.variant != null ? `?variant=${d.variant}` : ''}`;

/** what a document's brief says it changes: "3 fields: source, label, schema" */
export const summaryText = (d: Listed) => {
	const s = d.summary;
	if (!s) return '';
	const n = `${s.changes} ${s.changes === 1 ? 'change' : 'changes'}`;
	return s.fields.length ? `${n}: ${s.fields.join(', ')}` : n;
};

/** Makes a reader of an intent's documents over `get` (the site's api): each read once, a second ask the same answer. */
export function createOpened<R>(get: (path: string) => Promise<R>) {
	const kept = new Map<string, Promise<R>>();
	return {
		read(intent: string, d: Pick<Listed, 'doc' | 'variant'>): Promise<R> {
			const path = docPath(intent, d);
			let got = kept.get(path);
			if (!got) {
				got = get(path);
				kept.set(path, got);
				// a failure is not kept: opened again, it is asked again
				got.catch(() => kept.delete(path));
			}
			return got;
		},
		forget() {
			kept.clear();
		}
	};
}
