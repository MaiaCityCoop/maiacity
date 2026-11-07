					if (cost < best.cost) best = {
						at: p,
						dir: d,
						cost
					};
				}
				if (best.cost < .004 * (swing + .5)) break;
			}
			if (best.cost < .01) break;
		}
