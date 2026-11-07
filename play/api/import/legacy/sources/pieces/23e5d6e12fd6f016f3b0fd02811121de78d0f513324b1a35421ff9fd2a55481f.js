const COLOURS = /* @__PURE__ */ (() => /* @__PURE__ */ new Map())();
/** a colour by its text, read once */
const tint = (c) => {
	if (c instanceof three.Color) return c;
	const key = String(c);
	let got = COLOURS.get(key);
	if (!got) COLOURS.set(key, got = new three.Color(c));
	return got;
};
