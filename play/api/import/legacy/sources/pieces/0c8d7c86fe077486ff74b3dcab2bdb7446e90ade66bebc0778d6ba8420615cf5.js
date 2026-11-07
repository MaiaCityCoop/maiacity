				const a = (k * L.per * 2 + m) * 2.39996;
				const twig = .05 + .35 * (k / 18);
				leaf(at.clone().add(v3(Math.cos(a) * twig, 0, Math.sin(a) * twig)), v3(Math.cos(a), 0, Math.sin(a)).addScaledVector(dir, .6));
			}
		}
		return;
