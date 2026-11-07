			0,
			0
		];
		r[axis] = amp * Math.pow(grow, i) * Math.sin(TAU * freq * t - lag * i);
		out[n] = r;
	});
	return out;
}

//#endregion
//#region src/lib/actors/plans/bird.ts
const mirror$1 = (p) => [
	-p[0],
	p[1],
	p[2]
];
