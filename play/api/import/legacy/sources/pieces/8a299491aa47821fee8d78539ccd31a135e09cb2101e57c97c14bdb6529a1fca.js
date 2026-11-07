		const ankle = sk.at(`tarsus${s}`), toes = sk.at(`toes${s}`);
		const step = g && m ? footAt(g, m, s, pace) : {
			stance: true,
			u: .5,
			z: 0,
			y: 0
		};
		const extra = plant[s];
		const target = new three.Vector3(toes[0], toes[1] + step.y + (extra?.y ?? 0), toes[2] + step.z + (extra?.z ?? 0));
		let lean = 0, curl = extra?.curl ?? 0;
		if (g) {
			if (step.stance) lean = g.tilt * pace * (step.u - .5);
			else {
				lean = g.tilt * pace * (.5 - step.u) + g.fold * Math.min(1, pace * 1.5) * Math.sin(Math.PI * step.u);
				curl += g.curl * Math.min(1, pace * 1.5) * Math.sin(Math.PI * Math.min(1, step.u * 1.2));
			}
		}
		const tarsus = swung(ankle, toes, lean);
		const len = Math.hypot(toes[0] - ankle[0], toes[1] - ankle[1], toes[2] - ankle[2]);
		reach(sk, pose, `thigh${s}`, `shank${s}`, ankle, target.clone().addScaledVector(tarsus, -len));
		point(sk, pose, `tarsus${s}`, toes, tarsus);
		point(sk, pose, `toes${s}`, toe[s], swung(toes, toe[s], curl));
	}
}
/** The head carried to a point (model space) by the last two neck bones, the beak along `look`. */
