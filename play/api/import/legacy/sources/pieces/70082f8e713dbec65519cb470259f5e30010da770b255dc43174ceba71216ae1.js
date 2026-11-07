const animal = (id, label, note) => ({
	id,
	label,
	note,
	make: CASTS[id],
	ready: () => prepare(id)
});
const LIST = /* @__PURE__ */ (() => [{
