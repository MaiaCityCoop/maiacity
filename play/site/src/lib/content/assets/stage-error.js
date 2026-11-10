// @ts-nocheck — plain JS
import { chunkFailed } from '$lib/site/app/newbuild';

/**
 * What the viewer says when its 3D stage did not open (./viewer.js `openStage`), by what really failed (intent
 * 8333276b): a part of the page that would not load (a chunk of a build the server no longer has, the network) is the
 * page's, not the browser's; anything else is a browser that gives this page no 3D drawing.
 * @param {unknown} e @returns {string}
 */
export function stageError(e) {
	const said = String(e?.message ?? e);
	return chunkFailed(e)
		? `A part of this page could not be loaded, so the 3D stage did not open: reload the page. (${said})`
		: `This browser couldn’t open the 3D stage: ${said}`;
}
