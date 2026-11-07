		],
		[
			110,
			2,
			SEAM
		],
		[
			112,
			13,
			LID$1
		]
	];
	const REL = v >= 7 ? {
		y: Y0 - 18,
		z: 22,
		x: 182
	} : {
		y: 150,
		z: 64,
		x: 0
	};
	const PX = Wh - POST_9.w, CATCH_Y = Y0 - 14;
	/** a front corner column in plan: inside the wall behind the face, round at the corner in front of it */
	const postP = (sx) => (p) => {
		const pt = (x, y) => at2(sx * x, y);
		p.moveTo(...pt(PX, Y0 - 30));
		p.lineTo(...pt(Wh - 4, Y0 - 30));
		p.lineTo(...pt(Wh - 4, Y0));
		p.lineTo(...pt(Wh, Y0));
		p.quadraticCurveTo(...pt(Wh, Lh), ...pt(Wh - 30, Lh));
		p.lineTo(...pt(PX, Lh));
		p.closePath();
	};
	if (v >= 8) {
		const F = FOOT_8;
		part("tray", {
			label: "Shell",
			what: "The pack’s outer shell: a foot (its floor tub and, across the face, a sill), walls, top and back in one smooth aluminium piece, open at the front above the sill where the service drawer slides in. It is what you carry and what the cube holds: the grip, the ClickLock and the two release buttons are all on it, in the sill.",
			specs: [
				["Outside", "460 × 480 × 125 mm"],
				["Foot and sill", `${F} mm high`],
				["Material", "Aluminium, 3 mm, black anodised"],
				["Corners", "R 30 mm"]
			]
		}, (put) => {
			for (const [z0, h, c] of [
				[
					0,
					F,
					FACE
				],
				[
					F,
					90,
