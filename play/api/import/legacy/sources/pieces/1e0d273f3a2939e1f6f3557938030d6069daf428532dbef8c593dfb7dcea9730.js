	vec3 dqMove = 2.0 * ( dqReal.w * dqDual.xyz - dqDual.w * dqReal.xyz + cross( dqReal.xyz, dqDual.xyz ) );
#endif
`;
const NORMAL = `
//#piece 0f7217aa8b09f278283e55f560a9609a0940baca087ff8592c60d881e283ebcf
#endif
`;
const VERTEX = `
//#piece bd6b7126a6ea9e39afe2056521cb8a21c30ee3505bbdb3384ececb594bca6582
#endif
`;
let installed = false;
/** Every skinned mesh from here on skins by dual quaternions. */
function dualQuaternionSkinning() {
	if (installed) return;
	installed = true;
	const chunks = three.ShaderChunk;
	chunks.skinning_pars_vertex = chunks.skinning_pars_vertex + PARS;
	chunks.skinbase_vertex = BASE;
	chunks.skinnormal_vertex = NORMAL;
	chunks.skinning_vertex = VERTEX;
}

//#endregion
//#region src/lib/actors/rig.ts
function rig(bones, parts, materials) {
	dualQuaternionSkinning();
	const byName = {};
	const at = {};
	const parent = {};
	const list = [];
	for (const b of bones) {
		const bone = new three.Bone();
		bone.name = b.name;
		at[b.name] = new three.Vector3(...b.at);
		parent[b.name] = b.parent;
		if (b.parent) {
			bone.position.copy(at[b.name]).sub(at[b.parent]);
			byName[b.parent].add(bone);
		} else bone.position.copy(at[b.name]);
		byName[b.name] = bone;
		list.push(bone);
	}
