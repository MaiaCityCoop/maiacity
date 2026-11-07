	r.pose(relaxed);
	const poses = s === 1.7 / MEASURED ? POSES : posesFor(s);
	return {
		rig: r,
		clips: clipsFor(s, poses),
		poses,
		first: "idle"
	};
}

//#endregion
