/** @param {string} text @param {string} bg @param {string} fg */
const plateMat = (text, bg, fg) => new three.MeshStandardMaterial({
	map: plate(text, bg, fg),
	roughness: .5
});
/**
//#piece 057b77f946af112fecd57bf5db31d66d677a0339b9bdc507d00ba60449f5911d
