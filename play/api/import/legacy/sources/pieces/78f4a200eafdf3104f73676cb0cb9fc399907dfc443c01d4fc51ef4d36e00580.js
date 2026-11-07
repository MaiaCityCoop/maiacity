//#piece ff85838fc38b2913a625519c18373084b8b70f3d3e5b8559ea21cc2c6875b36c
/** a feathery leaflet: thread-thin (dill), or cut into narrow lobes (coriander's upper leaves) */
const thread = (u) => .15 * (1 - u) + .05;
const flatLeaf = (u) => Math.pow(Math.sin(Math.PI * Math.pow(u, .7)), .7) * (1 + (u > .2 ? Math.abs(Math.sin(u * 14)) * .3 : 0));
/**
* @param {Umbel} spec
* @returns {(g: number, seed: string) => THREE.Group}
//#piece 6bf428bd391139cb7aac064fddcd2c69e861216f06fa871abbffef8e7a795d7e
