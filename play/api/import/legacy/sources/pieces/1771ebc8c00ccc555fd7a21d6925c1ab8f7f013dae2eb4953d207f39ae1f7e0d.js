	});
	if (v >= 8) part("handles", {
		label: "Grip",
		what: "One grip for one hand on the shell itself, in the middle of the sill across its foot: carry the pack by it and the shell takes the weight, never the drawer. Its trigger sits at the very height of the ClickLock’s pawls in the foot, so the two release cables run straight to them: close your fingers round it and the pawls pull back, so the pack slides out in the same move; let go and it clicks home again.",
//#piece 88c2bb8bbda725e8ad74acaf33ce7b47f3ecab7dca1ac61e0b7928f63a81df95
			["On", "The shell’s sill"],
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, GRIP_Z, 16, 28, 15, 5), DARK$1);
		put(box(0, Lh + 30, GRIP_Z, 180, 16, 15, 6), DARK$1);
		put(box(0, Lh + 38.5, GRIP_Z + 3, 120, 1, 2, .4), "#d9dcde");
	});
	else if (v >= 5) part("handles", {
		label: "Grip",
		what: (v >= 7 ? "One grip for one hand, down at the base plate’s level in the middle of its face, between the two release buttons:" : "One grip for one hand, low on its face near the case’s foot:") + " its trigger sits at the very height of the ClickLock’s pawls, so the two release cables run straight to them. Close your fingers round it and the trigger pulls both pawls back, so the pack slides out in the same move; let go and it clicks home again.",
//#piece 88c2bb8bbda725e8ad74acaf33ce7b47f3ecab7dca1ac61e0b7928f63a81df95
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, GRIP_Z, 16, 28, 34, 6), DARK$1);
		put(box(0, Lh + 30, GRIP_Z, 180, 16, 30, 8), DARK$1);
		put(box(0, Lh + 38.5, GRIP_Z + 4, 120, 1, 2, .4), "#d9dcde");
	});
	else if (v >= 4) part("handles", {
		label: "Grip",
		what: "One grip in the middle of its face, for one hand: close your fingers round it and its trigger pulls the ClickLock’s pawls back, so the pack slides out in the same move; let go and it clicks home again. The pack hangs balanced under it.",
		specs: [
			["Width", "150 mm, for a gloved hand"],
			["Release", "Trigger in the grip, ~20 N"],
			["Carries", "~26 kg [inferred]"]
		]
	}, (put) => {
		for (const sx of [-1, 1]) put(box(sx * 82, Lh + 14, 62, 16, 28, 34, 6), DARK$1);
		put(box(0, Lh + 30, 62, 180, 16, 30, 8), DARK$1);
		put(box(0, Lh + 38.5, 66, 120, 1, 2, .4), "#d9dcde");
	});
	else part("handles", {
//#piece 4b62b7b5e7c4c633018eea6019a72572d789b80b2de5a259c906d236806f524f
			for (const z of [38, 90]) put(cyl([
				sx * 175,
				Lh,
				z
			], [
				sx * 175,
				Lh + 28,
				z
			], 6, 10), DARK$1);
			put(cyl([
				sx * 175,
				Lh + 28,
				35
			], [
				sx * 175,
				Lh + 28,
				93
			], 7, 10), DARK$1);
//#piece 18c8d9217524d6bf234e946778790c20442d126c920a423d4b044109bfbe1537
