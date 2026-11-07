	const box = (w, h, d, r, at) => {
		const g = new three_addons_geometries_RoundedBoxGeometry_js.RoundedBoxGeometry(w, h, d, 3, r);
		g.translate(...at);
		return g;
	};
	return [
		{
			geo: loft([
				{
					y: .83,
					w: .02,
					d: .02
				},
				{
					y: .845,
					w: .2,
					d: .14
				},
				{
					y: .875,
					w: .31,
					d: .2
				},
				{
					y: .94,
					w: .355,
					d: .23,
					z: -.005
				},
				{
					y: 1,
					w: .33,
					d: .21
				},
				{
					y: 1.07,
					w: .305,
					d: .2,
					z: .005
				},
				{
					y: 1.17,
					w: .32,
					d: .215,
					z: .01
				},
				{
					y: 1.28,
					w: .36,
					d: .235,
					z: .015
				},
				{
					y: 1.37,
					w: .39,
					d: .225,
					z: .005
				},
				{
					y: 1.43,
					w: .42,
					d: .2,
					z: -.008
				},
				{
					y: 1.465,
