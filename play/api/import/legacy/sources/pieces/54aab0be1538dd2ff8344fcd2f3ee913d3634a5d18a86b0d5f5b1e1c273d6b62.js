//#piece 5badc263ce31215cfbb8f6dfcd1a7669c24965681b22b61df26f86456ef9959c
function trunk(group, height, radius, lean = 0) {
	const t = new three.Mesh(trunkGeo(), barkMat());
	t.scale.set(radius, height, radius);
	t.rotation.z = lean;
	t.castShadow = true;
	group.add(t);
}
