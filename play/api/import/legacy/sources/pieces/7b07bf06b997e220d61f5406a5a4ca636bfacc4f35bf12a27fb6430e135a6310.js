	if (!a) throw Error(`no asset ${e}/${n}@${r}${i ? `:${i}` : ``}`);
	if (!a.kept || typeof a.build != `function`) throw Error(`${e}/${n}@${r}: no builder of its own`);
