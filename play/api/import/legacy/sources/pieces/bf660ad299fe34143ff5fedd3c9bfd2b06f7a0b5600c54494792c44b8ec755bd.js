		const fore = leg[0] === "F";
		const top = sk.at(`cannon${leg}`), fet = sk.at(`foot${leg}`);
		const step = g && m ? footAt(g, m, leg, pace) : {
			stance: true,
			u: .5,
			z: 0,
			y: 0
		};
		const extra = plant[leg];
		const target = new three.Vector3(fet[0], fet[1] + step.y + (extra?.y ?? 0), fet[2] + step.z + (extra?.z ?? 0));
		let lean = 0, flip = 0;
		if (g) {
			const tilt = g.tilt * pace, fold = g.fold[fore ? 0 : 1] * Math.min(1, pace * 1.5);
			const heel = g.flip * .5 * pace;
			if (step.stance) {
				lean = tilt * (step.u - .5);
				flip = heel * smooth((step.u - .65) / .35);
				if (flip > 0) {
					const t3 = toe[leg];
					const tipAt = new three.Vector3(t3[0], t3[1], t3[2] + step.z);
					target.copy(tipAt).add(new three.Vector3(fet[0] - t3[0], fet[1] - t3[1], fet[2] - t3[2]).applyAxisAngle(new three.Vector3(1, 0, 0), flip));
				}
			} else {
				lean = tilt * (.5 - step.u) + fold * Math.sin(Math.PI * step.u);
				flip = heel * (1 - smooth(step.u / .3)) + g.flip * pace * Math.sin(Math.PI * Math.min(1, step.u * 1.3));
			}
		}
		const cannon = swung(top, fet, lean);
		const len = Math.hypot(fet[0] - top[0], fet[1] - top[1], fet[2] - top[2]);
		reach(sk, pose, `upper${leg}`, `lower${leg}`, top, target.clone().addScaledVector(cannon, -len));
		point(sk, pose, `cannon${leg}`, fet, cannon);
		point(sk, pose, `foot${leg}`, toe[leg], swung(fet, toe[leg], flip));
	}
}
/**
* The head carried to a point (model space) by its two neck bones, the muzzle pointing along `look` — the grass in
* front of the forefeet, a hand held out, the horizon.
