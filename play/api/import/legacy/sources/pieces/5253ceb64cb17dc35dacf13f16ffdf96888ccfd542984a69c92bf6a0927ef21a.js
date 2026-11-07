	const metalCap = m.metalness > .5 ? m.color.clone().lerp(new three.Color(.8, .8, .8), .35) : m.color.clone().multiplyScalar(.9);
	return capPatch(m, cap !== void 0 ? col(cap) : CAPS.style === "metal" ? metalCap : CAPS.red.clone(), capRough ?? (CAPS.style === "metal" ? .36 : .55), CAPS.style === "metal" && m.metalness > .5 ? 1 : 0);
}
//#piece 7a02d42d1ffaf24208c56f037c7a45be134e80455516bc51327b0bd285602a64
//#piece 436cd8e4a7bda136021348ba0e955700d287c5bebaf632742f5dc9bbf64f18af
//#piece 1c141d57669a9a8ee8b098a572edee35557d3090bdbb4a8090cb2c09cebf5201
