			...p,
			geo: p.geo.scale(s, s, s),
			color: typeof p.color === "string" ? p.color : ((f) => (v) => f(v.clone().divideScalar(s)))(p.color),
//#piece 032c7227f4aef36d00c8fc8c0db1c78a0deb34f988a368953c8d8bd14cc614f2
