const PLANTS = /* @__PURE__ */ (() => versioned(LAYERS.flatMap((l) => [...ALL].filter((p) => (p.layer ?? LAYER_OF[p.id] ?? "herbaceous") === l.id).map((p) => ({
	...p,
//#piece 514dcc9b881899b6afca337e9b61d05eb4a2863a66b62cad3b6db5ac75fe191c
//#piece 1d6412b6c6ba704e5b6c441fe4a436d6c401bdbd9524a6884a05494f9a7a6090
