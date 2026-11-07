/** the shoots a flushing tree flowers on: the outermost, its last flush, `share` of them (the same at every stage) */
function tips(ctx, share) {
	return ctx.shoots.filter((sh) => sh.end && sh.gen >= ctx.gens - 1 && sh.grown > .6 && chance(ctx.seed, "tip", ...sh.key)() < share);
