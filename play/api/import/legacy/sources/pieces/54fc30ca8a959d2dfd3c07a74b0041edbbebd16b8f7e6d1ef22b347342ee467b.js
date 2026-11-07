//#piece 046ac351c90060f663867453f5513fda2a8db333d9060a8ebb5b057b6e3fb2d0
//#piece a9849b51fc99cb96feae8af26df52d79b26d1a57aa1718b50bff56511226bf64
	const base = birdMoves(b, {
//#piece 8d4cf21830f5893100fa6e16777d5c92af4019861884b057cb5e2c36e9ee711c
				birdLegs(b, pose, null, null, 0, {
					L: {
						y: .02 * k,
						z: -.016 * k,
						curl: 1.1
					},
					R: {
						y: .02 * k,
						z: -.016 * k,
						curl: 1.1
					}
				});
				birdHead(b, pose, new three.Vector3(0, J.head[1] - .006 * k, J.head[2] + .01 * k), new three.Vector3(0, -.15, 1).normalize());
//#piece 46e03ccfde1e530b97365dd7717da3df8a76af3a5fbfb92fa483a747af847175
//#piece 0075c1bfa631017cf0ebbf581326bc4bcef42c9e4278d767d4e68a1d6919f389
				birdLegs(b, pose, null, null, 0, {
					L: { curl: .6 },
					R: { curl: .6 }
				});
				const look = wander(t, 3, seed + 2);
				birdHead(b, pose, new three.Vector3(.002 * k * look, J.head[1] + .006 * k, J.head[2] - .002 * k), beakDir.clone().applyAxisAngle(new three.Vector3(1, 0, 0), phrase ? -.55 : -.2).applyAxisAngle(new three.Vector3(0, 1, 0), .5 * look));
//#piece 65fbcebbf8dedb2d137a413f87583f44b2fb79acd89462a03aa61c63c548ba8f
				birdLegs(b, pose, null, null, 0, {
					L: {
						y: .008 * k,
						curl: .7
					},
					R: {
						y: .008 * k,
						curl: .7
					}
				});
				const look = wander(t, 2.2, seed + 5);
				birdHead(b, pose, new three.Vector3(.002 * k * look, J.head[1] - .008 * k, J.head[2] - .006 * k), beakDir.clone().applyAxisAngle(new three.Vector3(0, 1, 0), .9 * look));
//#piece dc4ec5965ae8c5973e6f3f87eca22da037b72172eefb6732bd0f88349f770692
