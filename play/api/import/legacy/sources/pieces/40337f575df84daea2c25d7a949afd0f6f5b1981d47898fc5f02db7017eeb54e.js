	let n = [...t].sort((e, t) => e.v - t.v);
	return n.map((t, r) => {
		let i = r === n.length - 1;
		return { v: t.v, date: t.date, note: t.note, build: i ? e : (t.build ?? e), kept: i || t.build !== void 0 };
	});
}
