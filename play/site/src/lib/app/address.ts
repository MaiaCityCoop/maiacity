// The addresses of play's pages that other pages link into, each written and read here alone, so a writer and its
// reader can't drift (every thing named by its UUID or hash; a route is only where it is shown).

/** a piece on the Pieces page, at version `v` */
export const pieceHref = (piece: string, v?: number | null) => `/pieces/?piece=${piece}${v ? `&v=${v}` : ''}`;
export const pieceAddress = (params: URLSearchParams) => ({ piece: params.get('piece'), v: params.get('v') });

/** the Library, filtered to a kind of file and searched (a hash finds its file) */
export const libraryHref = (kind: string, q: string) => `/library/?kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(q)}`;
export const libraryAddress = (params: URLSearchParams) => ({ kind: params.get('kind') ?? '', q: params.get('q') ?? '' });

/** a story on the Stories page, at its version numbered `n` (its newest without) */
export const storyHref = (id: string, n?: number | null) => `/stories/#${storyHash(id, n)}`;
export const storyHash = (id: string, n?: number | null) => `${id}${n ? `@${n}` : ''}`;
export const storyAddress = (hash: string) => {
	const [id, v] = decodeURIComponent(hash.replace(/^#/, '')).split('@');
	return { id: id || '', v: v ? Number(v) : null };
};
