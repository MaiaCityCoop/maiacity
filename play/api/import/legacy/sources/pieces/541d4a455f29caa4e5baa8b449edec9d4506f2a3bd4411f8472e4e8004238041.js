		];
		const inner = {
			w: rw - 2 * rv.t,
			h: rh - 2 * rv.t,
			d: rd - 2 * rv.t
		};
		const litres = inner.w * inner.h * inner.d * 1e3;
		part({
			id: "reservoir",
			label: "Hydraulic reservoir",
