const recipe = (id, v, variant) => recipeIn("buildings", BUILT, id, v, variant);
const list = () => recipesIn(BUILT);

//#endregion
exports.list = list;
exports.recipe = recipe;