const BUILT = /* @__PURE__ */ (() => versioned(LIST, "make", HISTORY))();
//#piece a64585360ad8b1861179424d1f487612adfb26315f67a46282340df231eae4ee
const recipe = (id, v, variant) => recipeIn("biomes", BUILT, id, v, variant);
const list = () => recipesIn(BUILT);

//#endregion
exports.list = list;
exports.recipe = recipe;