function grass() {
	const key = "grass";
	const hit = cache.get(key);
	if (hit) return hit;
	const size = 512;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const x = canvas.getContext("2d");
	const base = fbm(size, 81, 6, 5);
	const img = x.createImageData(size, size);
	for (let i = 0; i < size * size; i++) {
		const g = base(i % size, i / size | 0);
		set$1(img, i * 4, 70 + g * 40, 112 + g * 48, 44 + g * 20);
