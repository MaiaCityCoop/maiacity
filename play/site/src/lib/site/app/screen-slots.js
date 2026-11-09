/**
 * Where a world's chrome sits in the app's screen (`title`, `center`): named on the node, kept in its place in the page
 * (the app has no screen host for it).
 * @param {HTMLElement} node @param {string} name
 */
export function screenSlot(node, name) {
	node.dataset.screenSlot = name;
	return {
		update(/** @type {string} */ next) {
			node.dataset.screenSlot = next;
		}
	};
}
