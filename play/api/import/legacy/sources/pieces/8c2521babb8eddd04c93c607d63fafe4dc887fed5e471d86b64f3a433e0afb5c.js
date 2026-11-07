		const look = new three.Vector3(side * .6, -.8, .6).normalize();
		const base = b.sk.joint(pose, neck[0]);
		const headY = .008 + .012 * nibble - look.y * headLen * .9;
		const drop = base.y - headY;
		const ahead = Math.sqrt(Math.max(.04 ** 2, (.97 * neckLen) ** 2 - drop * drop));
		const target = new three.Vector3(side, headY, base.z + ahead);
		point(b.sk, pose, neck[0], j.neck[1] ?? j.head, target.clone().sub(base));
