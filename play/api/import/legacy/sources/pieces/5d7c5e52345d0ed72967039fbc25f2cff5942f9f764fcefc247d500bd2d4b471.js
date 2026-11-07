			const L = legs[side];
			names.forEach((n, i) => point(sk, pose, `${n}${side}`, L.l[i + 1], L.rest[i].clone().lerp(L.out[i], e).normalize()));
		}
	};
	const throat = (big) => [
		0,
		0,
		0,
		1 + big
	];
	const breathe = (t) => .12 * Math.max(0, Math.sin(t * 5.5));
	const idle = (t) => {
		const pose = {
			throat: throat(breathe(t)),
			head: [
				.03 * wander(t, 5, 3),
				.08 * wander(t, 4, 7),
				0
			],
			root: [
				0,
				6e-4 * Math.sin(t * 5.5),
				0
			]
		};
		throwLegs(pose, 0);
		return pose;
	};
	const croak = (t) => {
		const sac = Math.pow(Math.max(0, Math.sin(t * 3.2)), 2);
		const pose = {
			throat: throat(1.1 * sac),
			body: [
				-.08 * sac,
				0,
				0
			],
			head: [
				-.1 * sac,
				0,
				0
			]
		};
		throwLegs(pose, 0);
		return pose;
	};
	const L = .32 * k;
	const hop = (t, mo) => {
		const mm = onTheSpot(t, .4 * k, mo);
		const u = frac(mm.dist / L);
		const air = clamp((u - .12) / .4, 0, 1);
		const launch = smooth((u - .06) / .1) * (1 - smooth((u - .5) / .35));
		const height = Math.sin(Math.PI * air) * .09 * k;
		const z = L * (smooth(air) - u);
		const pose = {
			root: [
				0,
				height - .004 * k * Math.sin(Math.PI * clamp(u / .12, 0, 1)),
				z
			],
			body: [
				air > 0 && air < 1 ? -.45 * Math.sin(Math.PI * air) + .3 * smooth((air - .6) / .4) * (1 - smooth((u - .55) / .2)) : 0,
				0,
				0
			],
			throat: throat(.05)
		};
		throwLegs(pose, launch);
