const TREES = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** @param {string} seed @returns {Branch} */
function design(seed) {
	const cached = TREES.get(seed);
	if (cached) return cached;
