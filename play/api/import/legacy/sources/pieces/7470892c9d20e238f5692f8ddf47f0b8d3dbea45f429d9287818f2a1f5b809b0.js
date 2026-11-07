				top + 10
			], 3, 8), STEEL$1);
		});
		part("inner-plug", {
			label: "Inner plug",
			what: "At the back of the drawer: the BMS’s plus, minus and data in one plug that slides onto the inside of the shell’s back socket as the drawer goes home.",
			specs: [["Power", "2 × 120 A [inferred]"], ["Data", "CAN"]]
		}, (put) => {
			put(box(0, -Lh + 14, 40 + DZ, 150, 12, 30, 1), BLACK$1);
		});
		for (const [sx, side] of [[-1, "left"], [1, "right"]]) {
			if (v >= 9) {
				const bx = sx * (PX + 8), bz = 18, cz = 5.5 + DZ;
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button in the face of the shell’s corner column on its side, at the base plate’s level: part of the shell, so it stays put while the drawer comes out. Behind it a short plunger with a wedge runs back inside the column and pushes the catch’s bolt out of its notch in the base plate. Press both, pull the drawer by its finger pull, and the whole inside slides out between the columns.",
					specs: [
						["Button", "⌀ 10 mm, 4 mm travel"],
						["On", "The shell’s corner column"],
//#piece 706da224a5d479d19ba5d452fafbd3ff79499f389ee2c72454aa0d4856cb2861
					], 7, 18), STEEL$1);
					put(cyl([
						bx,
						Lh - 4,
						bz
					], [
						bx,
						Lh + 2.4,
						bz
					], 5, 18), "#3a3f44");
					put(cyl([
						bx,
						Lh - 6,
						bz
					], [
						bx,
						CATCH_Y + 6,
						bz
					], 1.8, 6), STEEL$1);
					put(box(bx, CATCH_Y + 4, (bz + cz) / 2, 6, 6, cz - bz + 6, .5), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring bolt lying across inside the shell’s corner column, at the base plate’s height: its spring pushes its tip into a notch in the base plate’s edge and holds the drawer in. The button’s wedge pushes it back out; slide the drawer home and the bolt clicks in again on its own.",
					specs: [
						["Bolt", "Stainless, ⌀ 6 mm, 5 mm travel"],
						["Spring", "Compression, ~12 N [inferred]"],
						["In", "The shell’s corner column"]
					]
				}, (put) => {
					put(cyl([
						sx * (PX - 4.5),
						CATCH_Y,
						cz
					], [
						sx * (Wh - 8),
						CATCH_Y,
						cz
					], 2.5, 12), STEEL$1);
					put(cyl([
						sx * (PX + 9),
						CATCH_Y,
						cz
					], [
						sx * (PX + 11),
						CATCH_Y,
						cz
					], 3.5, 12), STEEL$1);
					for (let k = 0; k < 5; k++) put(cyl([
						sx * (PX + 13 + k * 4),
						CATCH_Y,
						cz
					], [
						sx * (PX + 14 + k * 4),
						CATCH_Y,
						cz
					], 3.4, 10), "#b8bdc0");
				});
				continue;
			}
			if (v >= 8) {
				const bx = sx * (Wh - 26), bz = FOOT_8 / 2;
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button in the shell’s sill, at its outer end on the face: part of the shell, so it stays put while the drawer comes out. A short rod behind it pulls the drawer’s catch on that side down. Press both, pull the drawer by its finger pull, and the whole inside slides out over the sill.",
					specs: [
						["Button", "⌀ 13 mm, 4 mm travel"],
						["On", "The shell’s sill"],
//#piece 706da224a5d479d19ba5d452fafbd3ff79499f389ee2c72454aa0d4856cb2861
					], 8.5, 18), STEEL$1);
					put(cyl([
						bx,
						Lh - 4,
						bz
					], [
						bx,
						Lh + 2.6,
						bz
					], 6.2, 18), "#3a3f44");
					put(cyl([
						bx,
						Lh - 6,
						bz
					], [
						sx * (Wh - 30),
						Y0 - 16,
						16
					], 1.6, 6), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring-steel tongue in the shell’s foot, just behind the sill: its hook springs up into a notch under the drawer’s base plate and holds the drawer in. The button on its side pulls it down.",
					specs: [
						["Tongue", "Spring steel, 1 mm"],
						["Hook", "8 × 6 mm"],
						["On", "The shell’s foot"]
					]
				}, (put) => {
					put(box(sx * (Wh - 30), Y0 - 26, 17, 10, 24, 2, .4), STEEL$1);
					put(box(sx * (Wh - 30), Y0 - 16, 21.5, 8, 6, 7, .8), STEEL$1);
				});
				continue;
			}
			if (v >= 7) {
				part(`release-${side}`, {
					label: `Release button, ${side}`,
					what: "A round push button low on the face, at its left or right end, level with the base plate. A short rod behind it pulls the drawer’s spring catch on that side in, out of its hole in the shell. Press both, pull the grip, and the drawer slides out: everything from the front.",
					specs: [["Button", "⌀ 16 mm, 4 mm travel"], ["Force", "~10 N each [inferred]"]]
				}, (put) => {
					put(cyl([
						sx * REL.x,
						Lh + .2,
						REL.z
					], [
						sx * REL.x,
						Lh + 1,
						REL.z
					], 11, 18), STEEL$1);
					put(cyl([
						sx * REL.x,
						Lh - 4,
						REL.z
					], [
						sx * REL.x,
						Lh + 3,
						REL.z
					], 8, 18), "#3a3f44");
					put(cyl([
						sx * REL.x,
						Lh - 6,
						REL.z
					], [
						sx * (Wh - 10),
						REL.y + 4,
						REL.z
					], 1.8, 6), STEEL$1);
				});
				part(`catch-${side}`, {
					label: `Drawer catch, ${side}`,
					what: "A spring-steel tongue on the base plate, just inside the shell’s front: its knob springs out into a hole in the shell’s side and holds the drawer in. The front button on its side pulls it back.",
					specs: [["Tongue", "Spring steel, 1 mm"], ["Knob", "⌀ 8 mm"]]
				}, (put) => {
					put(box(sx * (Wh - 9), REL.y, (8 + REL.z) / 2 + 1, 2, 14, REL.z - 6, .5), STEEL$1);
					put(cyl([
						sx * (Wh - 10),
						REL.y,
						REL.z
					], [
						sx * (Wh + .6),
						REL.y,
						REL.z
					], 4, 12), STEEL$1);
				});
				continue;
			}
			part(`release-${side}`, {
				label: `Release button, ${side}`,
				what: "A round push button flush in the shell’s side. Press both at once and they push the drawer’s two spring catches back inside, out of their holes; pull the grip and the drawer slides out. In a cube the buttons face the rails, so the drawer can only come out of a pack that is out.",
				specs: [["Button", "⌀ 16 mm, 4 mm travel"], ["Force", "~10 N each [inferred]"]]
			}, (put) => {
				put(cyl([
					sx * (Wh + .2),
					REL.y,
					REL.z
				], [
					sx * (Wh + 1),
					REL.y,
					REL.z
				], 11, 18), STEEL$1);
				put(cyl([
					sx * (Wh - 4),
					REL.y,
					REL.z
				], [
					sx * (Wh + 2.5),
					REL.y,
					REL.z
				], 8, 18), "#3a3f44");
			});
			part(`catch-${side}`, {
				label: `Drawer catch, ${side}`,
				what: "A spring-steel tongue standing up from the base plate: its knob springs out into a hole in the shell’s side and holds the drawer in. Its release button pushes it back.",
				specs: [["Tongue", "Spring steel, 1 mm"], ["Knob", "⌀ 10 mm"]]
			}, (put) => {
				put(box(sx * (Wh - 7), REL.y, (8 + REL.z) / 2 + 2, 2, 14, REL.z - 4, .5), STEEL$1);
				put(cyl([
					sx * (Wh - 8),
					REL.y,
					REL.z
				], [
					sx * (Wh - 4),
					REL.y,
					REL.z
				], 5, 12), STEEL$1);
			});
		}
	} else {
		part("lid", {
			label: "Lid",
			what: "The lid, its round corners and soft edge flush with the case, and the spring pad under it: closing it presses every contact plate onto its poles, the whole pack’s only joining force.",
			specs: [["Pad", "Silicone foam, ~0.2 MPa [inferred]"], ["Corners", "R 30 mm"]]
		}, (put) => {
			put(slab(W, LEN, RC, H - 13, 13, 0, 5), LID$1);
