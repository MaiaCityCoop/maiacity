//#piece 4a02c396ad62bcc353e0ee1be1e07c27cb15199254e83d201107ad6bae1109c0
//#piece 05ca5de5bcb57d42aaa13613efc6bdc38032741e51202af17f2e598ec6fd9b36
}

//#endregion
//#piece b48190ee01f7099275c7cf20a7700c12603d831fa5ee6c18e7f33ccfdc98449a
//#piece 6cdc5762c73bb286f714fbc6acd254fa986c6b14ef152c0e519354fa53a2303f
	id: "seed-packet",
	label: "Seed packet",
	note: "a paper envelope of 7 × 10 cm, a few seeds in it, its fruit or nut printed on the front with its name: one for each of V1’s ten trees (apple, pear, sweet cherry, plum, apricot, quince, mulberry, walnut, sweet chestnut, hazel), and the blackcurrant it had before",
	usedIn: "MaiaCity V1",
	make: () => seedPacket("apple"),
	variants: Object.entries(ALL_PACKETS).map(([id, p]) => ({
		id: `seed-packet-${id}`,
		label: p.label,
		note: `${p.label}, ${p.latin}`,
		make: () => seedPacket(id)
	}))
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
