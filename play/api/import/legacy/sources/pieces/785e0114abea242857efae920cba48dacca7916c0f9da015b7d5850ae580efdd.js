			put(prism(shellU(0), H - 4, 4), LID$1);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 60), -15, -1, 20, LEN - 110, 3), DARK$1);
		});
		part("front", {
			label: "Front plate",
			what: "The upright of the service drawer’s L: the pack’s whole face, its round front corners and bands flush with the shell. It carries the grip, the charge strip and the ClickLock; the base plate is fixed to its foot.",
			specs: [["Size", "460 × 30 × 125 mm"], ["Material", "Aluminium, black anodised"]]
		}, (put) => {
			for (const [z0, h, c] of BANDS) put(prism(capD, z0, h), c);
			put(box(0, Lh + 1, 62, 380, 3, 80, 1), FACE);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 1.2), Y0 + .8, H / 2, 3, 1.6, H - 1), HOLE);
			put(box(0, Y0 + .8, H - 1, W - 4, 1.6, 3), HOLE);
		});
		part("base", {
			label: "Base plate",
			what: "The floor of the service drawer’s L: every inner part is mounted on it, the cells’ holders, the contact plates, the clamp and the BMS. It runs on the shell’s floor on two low-friction strips.",
			specs: [
				["Size", "444 × 446 × 5 mm"],
				["Material", "Aluminium, 5 mm"],
				["Runs on", "2 PTFE strips"]
			]
		}, (put) => {
			put(box(0, (Y0 - Lh + 4) / 2, 5.5, W - 16, Y0 + Lh - 4, 5, 1), STEEL$1);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 40), (Y0 - Lh + 4) / 2, 3.5, 14, Y0 + Lh - 10, 1, .3), "#e8e8e4");
		});
	} else part("tray", {
		label: "Case",
		what: "The pack’s case: one smooth aluminium shell with round corners, its floor and four walls, a darker foot band, and rails under it to slide on.",
		specs: [
			["Outside", "460 × 480 × 112 mm"],
			["Material", "Aluminium, 3 mm, black anodised"],
			["Corners", "R 30 mm"]
		]
	}, (put) => {
