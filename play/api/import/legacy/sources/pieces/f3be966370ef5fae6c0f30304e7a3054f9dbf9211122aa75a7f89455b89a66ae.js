		}
	]
}];
/** the biomes, each with its version and history ($lib/app/versions.js) */
const BIOMES = /* @__PURE__ */ (() => versioned(LIST$1, "cover", {}))();
/**
* Which kind of a biome's cover stands at x, z (its index in `recipe.cover`), or −1 for none. Each kind grows in its
* colonies (its own noise, at its colony's size, over the threshold its spread sets) on the surface it belongs on;
* inside a colony its plants stand close (as many as the biome's density says a square metre holds), outside it none —
* so a wood anemone carpets its patch and leaves the next bare. Where colonies overlap, the kinds share the ground by
* their shares. `hidden`, the kinds to leave out (the explorer's toggles).
* @param {Recipe} recipe @param {() => number} r @param {number} x @param {number} z @param {Set<number>} [hidden]
