//#piece 3e1ce6d5256eba7860bc331b9d64e18b1d5da535d89255a1a7e44a7e425fa987
			-.5 - .9 * (.5 + .5 * w)
		];
		birdLegs(b, pose, null, null, 0);
		birdHead(b, pose, new three.Vector3(0, j.head[1] + .02, j.head[2] - .02), new three.Vector3(0, .3, 1).normalize());
//#piece c7cc82d387fe8a6cf7613ba03e72fcf3c05ba64e2a0cfe2a46b80cff5df62f1d
		];
		birdLegs(b, pose, null, null, 0);
		birdHead(b, pose, new three.Vector3(.03 * sway, j.body[1] + .08, j.head[2] + headLen * 1.2), new three.Vector3(.1 * sway, -.1, 1).normalize());
