	const front = ["fl", "fr"].map((id) => {
		const sx = id === "fl" ? 1 : -1;
		return doubleWishbone(kit, {
			id,
			label: id === "fl" ? "front left" : "front right",
			corner: corners[id],
			body,
			upper: [[
