//#piece a80e327597d12917d275df049c2cc73fd69323e53185f7e1831f0979c863628f
	bag.add("body", tube(pts, (u) => o.radius * (.4 + .6 * grown) * (1 - .75 * u), (u) => mix$1("#c8a878", "#f4ecd8", u * 1.4 - clamp(o.age) + .3), 5));
//#piece cadd318d92650df447493562a86759f77d55dc962cda2b3950f5ad86c0f97b99
		bag.add("body", bead(p.add(v3(Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius)), v3(s, s * .85, s), mix$1("#e8a0a0", "#c87a7a", r()), 3));
	}
