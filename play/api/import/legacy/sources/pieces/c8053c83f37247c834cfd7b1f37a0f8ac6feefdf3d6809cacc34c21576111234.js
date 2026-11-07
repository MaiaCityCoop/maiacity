	const { W, L: LEN, H } = PACK$1;
	const Wh = W / 2, Lh = LEN / 2;
	const rowY = (i) => CELLS$1.y + (i - (CELLS$1.s - 1) / 2) * CELLS$1.pitch;
	const colX = (j) => (j - (CELLS$1.p - 1) / 2) * CELLS$1.pitch;
	const zone = {
		w: CELLS$1.p * CELLS$1.pitch + 6,
		l: CELLS$1.s * CELLS$1.pitch + 6
	};
