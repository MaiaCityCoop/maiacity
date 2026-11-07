	]) mix[name] = (a[name] ?? 0) + ((b[name] ?? 0) - (a[name] ?? 0)) * k;
	return mix;
}
/** Build an excavator from its spec: its skeleton, its skin, its moves. @param {Spec} spec @returns {Cast} */
function excavatorCast(spec) {
	const { J, wheels: w } = spec;
	/** @type {import('./rig').BoneSpec[]} */
	const bones = [
		{
			name: "base",
			at: J.base
		},
		...J.blade ? [{
			name: "blade",
			parent: "base",
			at: J.blade
		}] : [],
