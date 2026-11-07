//#piece 5bd01ce5c30189b5daf816ae526f27d51f49fe9826a6f82ccba924fed1a05b5c
			const leaf = sheet({
				length: len,
				width: o.leaf.width * grown * shrink,
				shape: o.leaf.shape,
				lift: (u, v) => .06 * v * v - .05 * u * u * (1 + o.wither * 4),
				paint: (u, v) => mix$1(mix$1(o.leaf.color, o.leaf.vein, Math.abs(v) < .12 ? .6 : 0), "#d9c45a", o.wither * 1.2 - .1 + u * o.wither * .4),
				along: 10,
				across: 6
			});
			bag.add("sheet", leaf, aim(top, d, side * (1 - o.open) * 1.4));
		}
	}
	return {
		top,
		dir: tip
	};
}

//#endregion
