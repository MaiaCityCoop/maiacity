			put(prism(shellU(0), H - 4, 4), LID$1);
			put(prism(capD, 0, F), FACE);
			if (v >= 9) {
				for (const sx of [-1, 1]) put(prism(postP(sx), 19, POST_9.top - F + 1), FACE);
				put(box(0, Lh + .6, F, 2 * PX - 2, 1.4, 1.2), HOLE);
				for (const sx of [-1, 1]) {
					put(box(sx * PX, Lh + .6, (F + POST_9.top) / 2, 1.4, 1.4, POST_9.top - F), HOLE);
					put(box(sx * (PX + 8), Lh + .6, POST_9.top, 16, 1.4, 1.2), HOLE);
				}
			} else put(box(0, Lh + .6, F, W - 8, 1.4, 1.2), HOLE);
			for (const sx of [-1, 1]) put(box(sx * (Wh - 60), -15, -1, 20, LEN - 110, 3), DARK$1);
		});
		part("front", {
			label: "Front plate",
			what: "The upright of the service drawer’s L: the pack’s face above the sill, its round front corners and bands flush with the shell. A long finger pull along its foot and the charge strip along its top; nothing you carry by. The base plate is fixed to its foot.",
			specs: [
				["Size", `460 × 30 × ${H - F} mm`],
				["Pull", "Finger slot, 240 mm"],
				["Material", "Aluminium, black anodised"]
			]
		}, (put) => {
			const Z = v >= 9 ? POST_9.top : F;
			for (const [z0, h, c] of [
				[
					Z,
					110 - Z,
