			{
				geo: limb([
					x * .185,
					1.43,
					-.01
				], [
					x * .2,
					1.17,
					-.02
				], .047, .04),
				color: (p) => p.y > 1.32 ? k.shirt : k.skin,
				chain: {
					bones: [`upperArm${s}`, `forearm${s}`],
					soft: .06
				}
			},
			{
				geo: limb([
					x * .2,
					1.17,
					-.02
				], [
					x * .205,
					.915,
					0
				], .041, .031),
				color: k.skin,
				chain: {
					bones: [`forearm${s}`, `hand${s}`],
					soft: .05
				}
			},
			{
				geo: limb([
					x * .205,
					.915,
					0
				], [
					x * .207,
					.74,
					.012
				], .034, .028, { flat: .48 }),
				color: k.skin,
				chain: {
					bones: [`hand${s}`],
					soft: .03,
					tip: [
						x * .207,
						.72,
						.012
					]
				}
			},
			{
				geo: limb([
					x * .2,
					.9,
					.028
				], [
					x * .19,
					.83,
					.055
				], .014, .012),
				color: k.skin,
				bone: `hand${s}`
			},
			{
				geo: limb([
					x * .095,
					.96,
					0
				], [
					x * .1,
					.5,
					.01
				], .088, .058),
				color: k.trousers,
				chain: {
					bones: [`thigh${s}`, `shin${s}`],
					soft: .08
				}
			},
			{
				geo: limb([
					x * .1,
					.5,
					.01
				], [
					x * .1,
					.09,
					-.005
				], .056, .045),
				color: k.trousers,
				chain: {
					bones: [`shin${s}`, `foot${s}`],
					soft: .06
				}
			},
			{
				geo: box(.1, .085, .27, .035, [
					x * .1,
					.05,
					.065
				]),
				color: k.shoes,
				chain: {
					bones: [`foot${s}`],
					soft: .04,
					tip: [
						x * .1,
						.03,
						.2
					]
				}
			},
			{
				geo: box(.104, .018, .274, .008, [
					x * .1,
					.009,
					.065
				]),
				color: k.soles,
				bone: `foot${s}`
			}
		])
	];
}
/** the bones and the parts, measured for 1.80 m, scaled by s */
