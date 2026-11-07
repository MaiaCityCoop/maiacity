function birdSkeleton(j) {
	const neck = j.neck.map((_, i) => `neck${i + 1}`);
	const bones = [
		{
			name: "body",
			at: j.body
		},
		...neck.map((name, i) => ({
			name,
