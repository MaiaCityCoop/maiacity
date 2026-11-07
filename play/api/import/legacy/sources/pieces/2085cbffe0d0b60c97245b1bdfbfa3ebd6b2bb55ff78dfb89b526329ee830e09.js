*/
//#piece bfcd3d28c97dea5de87d5b75feadbee84586c1bd1e13eb4176e24993ca819c4c
//#piece 4595101ef7373ebfcf4ccc0e5fe13ddb0146002abcc846dd493a2b983127b0e3
const PLANTS = /* @__PURE__ */ (() => versioned(LAYERS.flatMap((l) => [...FIELDS].filter((p) => (p.layer ?? LAYER_OF[p.id] ?? "herbaceous") === l.id).map((p) => ({
	...p,
//#piece 514dcc9b881899b6afca337e9b61d05eb4a2863a66b62cad3b6db5ac75fe191c
//#piece 1d6412b6c6ba704e5b6c441fe4a436d6c401bdbd9524a6884a05494f9a7a6090
