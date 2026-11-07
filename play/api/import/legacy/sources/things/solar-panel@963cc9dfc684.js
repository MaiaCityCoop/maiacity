//#piece 49104d7457fe163f981b9e640a6f5937ff462c21b647214f4fdbb33127b7afea
//#piece efa37ec2ebe7fd27b97d67a9b384bd02beb11e72c9b27fc9606d71a95423c360
//#piece 266c6394d3573f53dbf1fe1b42fc41a33d94bb86bd44d7f2eeaaaaab00accfba
const m$1 = /* @__PURE__ */ (() => ({
//#piece a0cde774154b00b7db657bc1ce342f40e48fed0ad288203cb310158caa19be20
	part(p, 1.72, .035, 1.13, m$1.galv(), 0, 0, 0);
//#piece 70ce7fc64284b554eac0a1ee9102c98d63456d40aadaf4f48d9e5ba58e9cfa70
	return p;
}

//#endregion
//#piece 1fad81862bf595e11e35d09dd82eb51a8d3917092cf1748859fdf0fdc1e7d49d
//#piece b10512ecda903f10c66e30aa2f061f47685ea738f4e21b2811a616c66ddfc429
		bar(g, v3(x, .1, front), v3(x, .47, front), .025, m.galv());
		bar(g, v3(x, .1, -front), v3(x, high - .03, -front), .025, m.galv());
		bar(g, v3(x, .12, front), v3(x, .12, -front), .02, m.galv());
		for (const z of [front, -front]) part(g, .3, .12, .3, m.concrete(), x, .06, z);
	}
	part(g, .12, .08, .05, m.trim(), 0, high - .12, -front + .08);
	bar(g, v3(0, high - .15, -front + .08), v3(0, .02, -front - .3), .012, m.cable());
//#piece 6cdc5762c73bb286f714fbc6acd254fa986c6b14ef152c0e519354fa53a2303f
	id: "solar-panel",
	label: "Solar panel",
	note: `${VILLAGE_INFO.solar.note}. The Village COOP’s`,
	usedIn: "MaiaCity V1",
	make: () => solarPanel()
//#piece 92ca3a7ad6eb1bbbcddfbc63ca5bc7e157e6fb6065a9e5cb6ca8b3e5176e382e
