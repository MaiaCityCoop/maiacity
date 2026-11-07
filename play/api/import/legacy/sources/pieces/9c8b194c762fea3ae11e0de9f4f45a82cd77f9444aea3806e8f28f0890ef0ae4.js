/** a citrus skin: round, finely pitted with oil glands */
const pitted = (u, v, p = .5) => Math.pow(Math.max(0, Math.sin(Math.PI * u)), p) * (1 + .012 * Math.sin(v * Math.PI * 2 * 31 + u * 47) * Math.sin(u * 61));
const citrusFlower = (colour) => ({
	petals: 5,
	length: .016,
	width: .006,
	colour,
	heart: "#f2e08a",
	sepals: 5,
	sepal: .004,
	stamens: 20,
	stamenColour: "#f6e070",
	flat: .4
});
