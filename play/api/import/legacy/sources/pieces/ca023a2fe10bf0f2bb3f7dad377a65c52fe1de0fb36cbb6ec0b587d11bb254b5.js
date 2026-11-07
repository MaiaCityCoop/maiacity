*/
const DETAIL = {
	id: "detail",
	label: "Detail",
	type: "number",
	min: .05,
	max: 1,
	step: .01,
	value: 1
};
const detailed = /* @__PURE__ */ (() => /* @__PURE__ */ new WeakMap())();
const withDetail = (list) => {
	if (!detailed.has(list)) detailed.set(list, list.map((a) => ({
		...a,
		make: (detail) => detail === void 0 || !(detail < 1) ? a.make() : lowDetail(() => a.make(), detail)
	})));
	return detailed.get(list);
};
const FAMILIES = /* @__PURE__ */ (() => versioned(LIST, "variants", HISTORY).map((f) => f.id === "stand-in" ? f : {
	...f,
	params: [{ ...DETAIL }],
	variants: withDetail(f.variants),
	versions: f.versions.map((v) => ({
		...v,
		build: withDetail(v.build)
	}))
}))();
//#piece a64585360ad8b1861179424d1f487612adfb26315f67a46282340df231eae4ee
const recipe = (id, v, variant) => recipeIn("actors", FAMILIES, id, v, variant);
const list = () => recipesIn(FAMILIES);

//#endregion
exports.list = list;
exports.recipe = recipe;