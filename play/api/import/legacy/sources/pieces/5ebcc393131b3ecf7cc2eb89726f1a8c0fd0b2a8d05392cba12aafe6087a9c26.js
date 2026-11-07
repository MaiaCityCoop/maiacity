//#piece 120e4c7971b87dbcbbb7d4d8aef1d067263ae3a5a8fe45bc97e7c723876f4eae
//#piece 09916de04cd0ab5f93ce8266d8b8eafa239008882a1c886421e3e447550a1607
	const reach = grown * steps;
//#piece aad93b06a5929a2006bda8fa07ed45b60478a8ec5af391c9a4eeffccde9fd5dd
	const age = clamp(o.age ?? 0);
	const r0 = radius * (.35 + .65 * grown);
	bag.add("body", tube(pts, (u) => r0 * (1 - .7 * u), (u) => mix$1(old, young, u * 1.5 + .5 - age), order ? 4 : 5));
//#piece bdfc4466c5baf47ff86e8e5c0309412c7d51c8ae875f6199813029480e9e5b62
//#piece 93d4bc1a67d285220b458d2e130ed2da8d4d55a756db65efeffa8fbff8cec895
