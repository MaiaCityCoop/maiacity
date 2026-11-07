*/
//#piece 5ca239210fc32d6e281e0813dc9427c03c277dc4f17e2c6d0783029907190002
//#piece 92dc3b93f25c79617ca79d35212e9ee299e1215942e63c6b017f3a7334acbd8d
		}) : spec.leader ? leaderCrown(bag, {
			seed,
			g,
			from: s.top.clone(),
			spec: spec.leader
		}) : [];
		const space = bag.space;
		for (const sh of shoots) if (sh.gen <= 2 && sh.radius > .01) space.rod(sh.pts, sh.radius + .01);
//#piece 8ca9c08ce894bee9c18966d415dcf7ed79913b3c8dcb2917bb264f548beb8fd3
//#piece 042e12155668156766c1c317cc401d6a016c1ddd49edede9cf2f28cd63dc65ee
			}
			if (f.sites === "limbs" && sh.gen === 1) {
				const lr = chance(seed, "limb-site", ...sh.key);
				const n = Math.floor(sh.length * f.chance);
				for (let k = 0; k < n; k++) sites.push({
					...along(sh.pts, between(lr, .25, .8)),
					key: [...sh.key, k]
				});
			}
//#piece 220da229420162108afc4b5538e2f7b057a8a0d6fedd5c8888086757b4250dec
					const p = along(sh.pts, between(tr, .12, .7));
					const a = tr() * Math.PI * 2;
					p.at.add(v3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(sh.radius * .8));
//#piece ae5bcbd6a6731f033b67fdae5418228e8a2ca80ce847c4149618cfed25b8b982
				if (lr() < .5) sites.push({
					...along(sh.pts, between(lr, .1, .35)),
					key: sh.key
				});
			}
		}
//#piece 247c6b2cb3b539b453e7e8e4ac262bfc2d257117795a377abf2a26d5de635e40
//#piece c407dc184eb727b3e226b7ec34f1142be079167130011888c64b9cf55682b47b
//#piece e7ff8bf36f2e19b043e7b3981e8a96b74ebb8e8da9cf7a476fea20e9e81c1519
//#piece dea30a317932d33200ed5636def64db6eb32afdd4195d00b41ae00899155ba40
*/
//#piece 97bad2759ca187567d52230cc27960cf5edba7b9edc8ee6509e3598d6664777d
//#piece 0934e15400c1bd2f1f2bc6b22e3b37e469121e9b4a17c19388a68e79a00b9b21
		const start = site.at.clone().addScaledVector(f.sites === "tips" ? up : site.dir, F.stalk * .25);
		const hangFrom = start.clone().addScaledVector(swing, F.stalk * .25).add(v3(0, -F.stalk * lerp(.3, 1, set), 0));
		const place = space.settle(hangFrom, v3(0, -1, 0).addScaledVector(swing, .15), (a, d) => [.3, .7].map((t) => ({
			c: a.clone().addScaledVector(d, L * t),
			r: W * .92
		})), F.stalk * .5 + W);
//#piece 719641e01f5589e80913587b5bbc37951d7f251620d769289bb19042b951ad54
		});
//#piece 7515271293b08c4640463053b8ea8dae89b286d5f14ef84704cef7e695532304
