		});
//#piece 92dc3b93f25c79617ca79d35212e9ee299e1215942e63c6b017f3a7334acbd8d
//#piece ca6ad5f07775fcfde2fa2a30c3a852adbcbe974570875fa68e335c0c3f0d85dc
				a: sh.pts[i].clone(),
				b: sh.pts[i + 1].clone(),
				r: sh.radius * (1 - .35 * ((i + 1) / (sh.pts.length - 1))) + .01
			});
		}
//#piece d15ee889881b471c422da29158fcc7e2192c7b3b621b52c9c34b357b23f2589e
//#piece 34ec115783a388f482bfd6baef99613ab10ac7708502db6da0052c72f523f314
				for (let k = 0; k < n; k++) sites.push(onBark$1(along$1(sh.pts, .35 + .6 * (k + ar() * .6) / n), sh.radius, ar, [
					...sh.key,
					"axil",
					k
				]));
			}
//#piece becae0bf799d57cdd16ed96c0485759a5b0e8d69e00106ed372576bc3e81b794
				for (let k = 0; k < n; k++) sites.push(onBark$1(along$1(sh.pts, between(sr, .3, .95)), sh.radius, sr, [
					...sh.key,
					"spur",
					k
				]));
			}
//#piece d9223c42d1da63e5e06e60bd1dd6f000cb20216ff57919b2f68b1648fe66937e
					sites.push(onBark$1(along$1(sh.pts, u), sh.radius * (1 - .35 * u), lr, [...sh.key, k]));
				}
			}
//#piece 220da229420162108afc4b5538e2f7b057a8a0d6fedd5c8888086757b4250dec
					const u = between(tr, .12, .7);
					const p = along$1(sh.pts, u);
//#piece 48088a2a7c5a7a32d8442cd7e151ce8c28d4ba8b822a0c6fba4bb6a7b038c112
					sites.push(onBark$1(along$1(sh.pts, u), sh.radius * (1 - .35 * u), lr, sh.key));
				}
			}
		}
		for (const site of sites) flowering$1(bag, spec, seed, g, site, space, vigour);
		for (const sh of shoots) leaves$1(bag, spec, seed, g, sh);
		return bag.build();
	};
}
/** a place along a path, u 0 … 1 */
//#piece c407dc184eb727b3e226b7ec34f1142be079167130011888c64b9cf55682b47b
