/** where things are in the pickup (v2), in its own frame (+z ahead, its left +x, the ground at 0): the driver's and
*  the passenger's hip points on their seats, the cab's floor, the steering wheel's middle, the bed's floor and its
*  back edge (where the tailgate hinges), and how far the tailgate reaches when it is down */
const PICKUP = /* @__PURE__ */ (() => ({
	driver: v3(.42, .84, .62),
	passenger: v3(-.42, .84, .62),
	floor: .56,
	wheel: v3(.42, 1.2, 1.12),
	bed: 1.16,
	tailgate: -2.62,
	gate: .44,
	/** v3's four doors: which side (x of their outer face), and the z of their front edge (the hinge) and back edge */
	doors: {
		driver: {
			x: .93,
			front: 1.53,
			back: .47
		},
		passenger: {
			x: -.93,
			front: 1.53,
			back: .47
		},
		rearL: {
			x: .93,
			front: .43,
			back: -.6
		},
		rearR: {
			x: -.93,
			front: .43,
			back: -.6
		}
	}
}))();
