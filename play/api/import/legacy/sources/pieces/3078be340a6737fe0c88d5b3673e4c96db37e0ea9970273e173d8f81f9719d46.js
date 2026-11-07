	const hang = (t) => wave(t, {
		dist: 0,
		speed: 0
	});
	return {
		rig: r,
		clips: {
			swim,
			turn,
			hang
		},
		first: "swim",
		gears: { swim: cruise }
	};
}

//#endregion
//#region src/lib/actors/species/frog.ts
const FROG_KINDS = [
	"bullfrog",
	"green",
	"common"
];
