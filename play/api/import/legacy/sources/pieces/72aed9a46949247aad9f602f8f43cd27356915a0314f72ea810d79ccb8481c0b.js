		group: e,
		id: t.id,
		version: n.v,
		variant: r ?? i?.id,
		label: i?.label ? `${t.label}: ${i.label}` : t.label,
		note: i?.note ?? n.note,
		params: t.params?.length ? JSON.parse(JSON.stringify(t.params)) : void 0,
	});
}
