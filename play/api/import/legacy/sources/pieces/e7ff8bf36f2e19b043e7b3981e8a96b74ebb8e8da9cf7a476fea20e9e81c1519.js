*/
function onBark(p, radius, r, key) {
//#piece acab48381dc99ca0985405f79e941e9990d488ee23ffd3796e73d005c4085e2a
	return {
		at: p.at.clone().addScaledVector(side, radius * .9),
		dir: side.clone().addScaledVector(p.dir, .6).normalize(),
		key
	};
}
//#piece 10be253320949b7a42ae06618a28f35677c89220b3cd3505cc0edff4e2bebc92
//#piece 6d73f1bbad1c562649f49bf0bbb18cb05363d5d5e00199517a64f25ffebac360
