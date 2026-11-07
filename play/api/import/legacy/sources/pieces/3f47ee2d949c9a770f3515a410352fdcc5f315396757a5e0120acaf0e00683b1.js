/** @type {Model[]} */
const CONTAINERS = /* @__PURE__ */ (() => versioned(CONTAINER_LIST, "make", HISTORY))();
/** the wayside of MaiaCity V1: buildings on the dusty highway and at the village centre, and the places they make
*  together; and at its end the bell tent from its v2 (./tent.js), which the Buildings list with the domes (./index.js) */
/** @type {(Omit<Model, 'versions' | 'version'> & { group: string })[]} */
