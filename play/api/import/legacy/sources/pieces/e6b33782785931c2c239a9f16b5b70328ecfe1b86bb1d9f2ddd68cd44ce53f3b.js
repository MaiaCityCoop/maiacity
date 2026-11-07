			], 1.2, 6), CASE$2);
			for (const sx of [-1, 1]) {
				put(cyl([
					sx * 150,
					back - 14,
					z
				], [
					sx * 150,
					f,
					z
				], 10, 14), BLACK$2);
				put(cyl([
					sx * 150,
					f,
					z
				], [
					sx * 150,
					back + 10,
					z
				], 5, 14), STEEL$2);
				put(cyl([
					sx * 150,
					back + 10,
					z
				], [
					sx * 150,
					back + 15,
					z
				], 5, 14, 1.5), STEEL$2);
			}
		}
		for (const x of [-60, 60]) put(box(x, back - 25, B + 300, 30, 10, 60, 1), COPPER$2);
	});
