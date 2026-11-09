// @ts-nocheck — data only: a graph of the allowlist (./graph.js), the test asset's (intent a5faafad, c5), shared by the tests

/** a glowing, swaying mushroom cap: the test asset's graph (c5) */
export const GLOW = {
	format: 1,
	nodes: [
		{ op: 'positionLocal' }, // 0
		{ op: 'time' }, // 1
		{ op: 'swizzle', in: [0], mask: 'y' }, // 2 height
		{ op: 'wind' }, // 3
		{ op: 'mul', in: [3, 2] }, // 4 sway grows with height
		{ op: 'float', value: 1.7 }, // 5
		{ op: 'mul', in: [1, 5] }, // 6
		{ op: 'sin', in: [6] }, // 7
		{ op: 'float', value: 0.04 }, // 8
		{ op: 'mul', in: [7, 8] }, // 9
		{ op: 'mul', in: [4, 9] }, // 10
		{ op: 'add', in: [0, 10] }, // 11 position
		{ op: 'float', value: 3 }, // 12
		{ op: 'mul', in: [0, 12] }, // 13
		{ op: 'fbm', in: [13], octaves: 4 }, // 14
		{ op: 'color', value: 0x2bd4a8 }, // 15
		{ op: 'color', value: 0x0b3d2e }, // 16
		{ op: 'mix', in: [16, 15, 14] }, // 17 colour
		{ op: 'mul', in: [1, 5] }, // 18
		{ op: 'sin', in: [18] }, // 19
		{ op: 'float', value: 0.5 }, // 20
		{ op: 'mul', in: [19, 20] }, // 21
		{ op: 'add', in: [21, 20] }, // 22 pulse 0..1
		{ op: 'mul', in: [15, 22] } // 23 glow
	],
	out: { position: 11, color: 17, emissive: 23 }
};

