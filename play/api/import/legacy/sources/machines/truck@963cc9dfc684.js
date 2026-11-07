//#piece 81e1848bc0f153d6150bee182488598f1e9394184f254db9d3ac92e8e41b6aec
//#piece 17460e0ac1bd4b9f27c2ec1e5b9ebce8c3c908091273dcdb178d56a00a13e516
function truck({ cab = "#c8c4bc", box = "#dcdad4" } = {}) {
//#piece fc8e86e29427db1846f875645a6b2390b87bfc8b1347dfed5e2f8c8fe79a9273
//#piece ccfd6067127caa8e506406bd7e3ab48bf831a612c159bf02efd5891ad8f723cc
//#piece 3c58ec3c0f7d0899ee473ff6c5af347a494a600d83613a763b151a4d1946ea0b
const HISTORY = /* @__PURE__ */ (() => ({}))();
/** @type {Omit<Family, 'versions' | 'version'>[]} */
const LIST = [{
	id: "truck",
	label: "Truck",
	note: "a cab and a box trailer on a long chassis, eight wheels, about 16 × 2.55 × 4 m: the trucks on the tired land’s highway, each in its own colours (a Thing until 2026-10-16, things/truck@1)",
//#piece a88617a6b77c5e3ca8b2aa3644065a31b23748500e544ea567e87ff8bfc6773e
		note: "a red cab and a white box trailer, as listed; a world gives each its colours (cab, box)",
		make: (cab = "#a33a2a", box = "#e0ddd6") => truck({
			cab,
			box
		})
//#piece 20511e453deb92755bacd120421d0eb6ad8a5a0f798a0e64253b61fe9748854f
