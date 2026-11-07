		p[`rack${s}${e}`] = [
			0,
			-sx * sz * 1.7 * (typeof racks === "number" ? racks : racks(`${s}${e}`)),
			0
		];
	}
	return p;
}
/** from 0 to 1 over [a, b] of the cycle, eased @param {number} u @param {number} a @param {number} b */
