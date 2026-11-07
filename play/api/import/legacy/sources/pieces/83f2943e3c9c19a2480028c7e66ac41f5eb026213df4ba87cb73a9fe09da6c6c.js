*/
function seeded(seed) {
	let s = seed >>> 0 || 1;
	return () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
}

//#endregion
//#region src/lib/sandbox-2/interior/spaces.ts
//#piece 7600908f7bff1c6b949b14bbb0744d90b54ef3340415dbbeda275873f644e03a
