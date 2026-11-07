			...p,
			geo: p.geo.scale(s, s, s),
			color: typeof p.color === "string" ? p.color : ((f) => (v, i) => f(v.clone().divideScalar(s), i))(p.color),
			...p.weights ? { weights: ((f) => (v) => f(v.clone().divideScalar(s)))(p.weights) } : {},
			...p.morph ? { morph: Object.fromEntries(Object.entries(p.morph).map(([name, d]) => [name, d.map((x) => x * s)])) } : {},
//#piece 032c7227f4aef36d00c8fc8c0db1c78a0deb34f988a368953c8d8bd14cc614f2
