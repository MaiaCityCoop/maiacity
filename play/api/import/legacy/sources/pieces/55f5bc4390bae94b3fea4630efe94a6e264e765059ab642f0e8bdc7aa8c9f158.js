//#piece 686fdf4acaf61271e9509c424186b4ad2195cb700e3627222df6abac6abfc66e
//#region \0entry
const recipe = (id, v, variant) => recipeIn("things", MODELS, id, v, variant);
const list = () => recipesIn(MODELS);

//#endregion
exports.list = list;
exports.recipe = recipe;