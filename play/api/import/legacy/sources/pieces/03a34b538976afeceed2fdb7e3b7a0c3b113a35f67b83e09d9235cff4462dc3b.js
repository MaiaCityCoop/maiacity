	"FL",
	"FR",
	"HL",
	"HR"
];
const mirror = (p) => [
	-p[0],
	p[1],
	p[2]
];
function quadSkeleton(j) {
	const tail = j.tail.slice(0, -1).map((_, i) => `tail${i + 1}`);
	const bones = [
		{
			name: "body",
			at: j.body
		},
		{
			name: "chest",
			parent: "body",
			at: j.chest
		},
		{
			name: "pelvis",
			parent: "body",
			at: j.pelvis
		},
		{
			name: "neck",
			parent: "chest",
			at: j.neck[0]
		},
		{
			name: "neck2",
			parent: "neck",
			at: j.neck[1]
		},
		{
			name: "head",
			parent: "neck2",
			at: j.head
		},
		...j.jaw ? [{
			name: "jaw",
			parent: "head",
			at: j.jaw
		}] : [],
		...j.ear ? [{
			name: "earL",
			parent: "head",
			at: j.ear[0]
		}, {
			name: "earR",
			parent: "head",
			at: mirror(j.ear[0])
		}] : [],
		...tail.map((name, i) => ({
			name,
			parent: i ? tail[i - 1] : "pelvis",
			at: j.tail[i]
		})),
